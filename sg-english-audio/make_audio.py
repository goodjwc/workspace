"""비행기에서 듣는 싱가포르 출장영어 음성 파일(MP3) 생성

한 문장 순서: 상대 말(영어, 싱가포르 억양) → 번역 → 내 답변(영어, 보통 속도) → 내 답변(천천히) → 번역
상대 말이 없는 문장은 상황 설명(한국어)으로 시작한다.

사용법:
  node export-data.js > data.json
  python make_audio.py data.json out/            # Edge 뉴럴 음성으로 생성 (인터넷 필요)
  python make_audio.py data.json out/ --fake     # 음성 대신 신호음으로 조립만 점검
"""
import asyncio
import hashlib
import json
import os
import re
import subprocess
import sys

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

VOICE_THEM = 'en-SG-WayneNeural'   # 상대(심사관·기사·직원): 싱가포르 영어
VOICE_ME = 'en-US-GuyNeural'       # 내 답변
VOICE_KO = 'ko-KR-SunHiNeural'     # 한국어 번역·안내
SLOW_RATE = '-35%'

GAP_SHORT = 0.5    # 문장 조각 사이
GAP_ITEM = 1.5     # 문장과 문장 사이
GAP_SCENE = 2.5    # 상황과 상황 사이

FILE_NAMES = {
    'immigration': '01-immigration', 'taxi': '02-taxi', 'hotel': '03-hotel',
    'restaurant': '04-restaurant', 'jumbo': '05-jumbo-seafood', 'core10': '06-core10',
}


def clean(text):
    """"A / B" 형태는 두 문장으로 읽는다."""
    return re.sub(r'\s*/\s*', '. ', text).strip()


def scene_segments(scene):
    """상황 하나를 (종류, 텍스트, 음성, 속도) 목록으로 만든다. 종류 'gap'은 무음(초)."""
    segs = [('tts', f"{scene['title']}.", VOICE_KO, '+0%'), ('tts', scene['en'] + '.', VOICE_ME, '+0%'),
            ('gap', GAP_ITEM)]
    for item in scene['items']:
        if item.get('q'):
            segs += [('tts', clean(item['q']), VOICE_THEM, '+0%'), ('gap', GAP_SHORT),
                     ('tts', clean(item['qKo']), VOICE_KO, '+0%'), ('gap', GAP_SHORT)]
        else:
            segs += [('tts', f"상황. {item['cue']}.", VOICE_KO, '+0%'), ('gap', GAP_SHORT)]
        segs += [('tts', clean(item['a']), VOICE_ME, '+0%'), ('gap', GAP_SHORT),
                 ('tts', clean(item['a']), VOICE_ME, SLOW_RATE), ('gap', GAP_SHORT),
                 ('tts', clean(item['aKo']), VOICE_KO, '+0%'), ('gap', GAP_ITEM)]
    segs.append(('gap', GAP_SCENE))
    return segs


def seg_file(cache, text, voice, rate):
    key = hashlib.sha1(f'{voice}|{rate}|{text}'.encode()).hexdigest()[:16]
    return os.path.join(cache, f'{key}.mp3')


async def synth_all(jobs, fake):
    """중복 없는 문장 조각을 합성한다 (동시 6개, 실패 시 재시도)."""
    sem = asyncio.Semaphore(6)

    async def one(path, text, voice, rate):
        if os.path.exists(path) and os.path.getsize(path) > 0:
            return
        async with sem:
            if fake:
                dur = 0.3 + 0.06 * len(text)
                subprocess.run([FFMPEG, '-v', 'error', '-y', '-f', 'lavfi', '-i',
                                f'sine=frequency=440:duration={dur:.2f}', '-ar', '24000', '-ac', '1',
                                '-b:a', '48k', path], check=True)
                return
            import edge_tts
            for attempt in range(5):
                try:
                    await edge_tts.Communicate(text, voice, rate=rate).save(path + '.tmp')
                    if os.path.getsize(path + '.tmp') == 0:
                        raise RuntimeError('empty audio')
                    os.replace(path + '.tmp', path)
                    return
                except Exception as e:  # 네트워크 오류 등
                    print(f'  retry {attempt + 1}: {voice} "{text[:30]}" ({e})', flush=True)
                    await asyncio.sleep(2 * (attempt + 1))
            raise RuntimeError(f'TTS failed: {voice} {text}')

    await asyncio.gather(*(one(*j) for j in jobs))


def silence(cache, seconds):
    path = os.path.join(cache, f'silence-{seconds:.2f}.mp3')
    if not os.path.exists(path):
        subprocess.run([FFMPEG, '-v', 'error', '-y', '-f', 'lavfi', '-i',
                        f'anullsrc=r=24000:cl=mono', '-t', f'{seconds}', '-b:a', '48k', path], check=True)
    return path


def concat(files, out, title, track=None):
    """조각들을 이어 붙여 하나의 MP3로 (다시 인코딩해서 길이·형식을 맞춘다)."""
    lst = out + '.txt'
    with open(lst, 'w') as f:
        for p in files:
            f.write(f"file '{os.path.abspath(p)}'\n")
    meta = ['-metadata', f'title={title}', '-metadata', 'album=싱가포르 출장 생존영어',
            '-metadata', 'artist=SG 영어']
    if track:
        meta += ['-metadata', f'track={track}']
    subprocess.run([FFMPEG, '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-ar', '24000', '-ac', '1', '-b:a', '64k', *meta, out], check=True)
    os.remove(lst)


def duration(path):
    r = subprocess.run([FFMPEG, '-i', path], capture_output=True, text=True)
    m = re.search(r'Duration: (\d+):(\d+):([\d.]+)', r.stderr)
    return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3]) if m else 0


def main():
    data_path, out_dir = sys.argv[1], sys.argv[2]
    fake = '--fake' in sys.argv
    scenes = json.load(open(data_path, encoding='utf-8'))
    cache = os.path.join(out_dir, '.cache')
    os.makedirs(cache, exist_ok=True)

    plan = {s['id']: scene_segments(s) for s in scenes}
    jobs = {}
    for segs in plan.values():
        for seg in segs:
            if seg[0] == 'tts':
                _, text, voice, rate = seg
                path = seg_file(cache, text, voice, rate)
                jobs[path] = (path, text, voice, rate)
    print(f'합성할 조각 {len(jobs)}개 ({"fake" if fake else "edge-tts"})', flush=True)
    asyncio.run(synth_all(list(jobs.values()), fake))

    all_files = []
    outputs = []
    for n, scene in enumerate(scenes, 1):
        files = [silence(cache, seg[1]) if seg[0] == 'gap' else seg_file(cache, *seg[1:])
                 for seg in plan[scene['id']]]
        all_files += files
        out = os.path.join(out_dir, f"sg-english-audio-{FILE_NAMES.get(scene['id'], scene['id'])}.mp3")
        concat(files, out, f"{n:02d}. {scene['title']}", track=f'{n}/{len(scenes)}')
        outputs.append(out)
    full = os.path.join(out_dir, 'sg-english-audio-00-full.mp3')
    concat(all_files, full, '00. 전체 (입국심사~핵심 10문장)')
    outputs.insert(0, full)

    for p in outputs:
        d = duration(p)
        print(f'{os.path.basename(p)}  {int(d // 60)}분 {int(d % 60)}초  {os.path.getsize(p) // 1024}KB')


if __name__ == '__main__':
    main()
