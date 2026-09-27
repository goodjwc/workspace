// 싱가포르 출장 생존영어 회화 데이터
// 원본: 싱가포르 출장 생존영어 회화 스크립트 (JWC 님 연습 정리본)
//
// 필드
//   q    : 상대(심사관·기사·직원)의 말. 없으면 null (내가 먼저 말하는 상황)
//   qKo  : 상대 말의 한국어 번역
//   cue  : 상황 설명 (q가 없을 때, 또는 보충 설명)
//   a    : 내 답변 (영어). " / " 로 구분된 것은 둘 다 정답
//   aKo  : 내 답변의 한국어 번역
//   pron : 내 답변의 한글 발음 표기 (*별표* = 강세). 앱 제작 시 추가한 참고용 표기
//   note : 발음·문법 팁 (선택)

const SCENES = [
  {
    id: 'immigration',
    icon: '🛂',
    title: '입국심사',
    en: 'Immigration',
    role: '심사관',
    tip: '귀국 날짜는 실제 일정에 맞게 바꾸기. 담배·껌 반입 규정이 엄격하니 "nothing to declare"는 정말 없을 때만.',
    items: [
      { q: 'Passport, please.', qKo: '여권 주세요.', a: 'Here you go.', aKo: '여기요.', pron: '히어 유 *고*우' },
      { q: "What's the purpose of your visit?", qKo: '방문 목적이 뭐예요?', a: "I'm here for a business conference.", aKo: '출장, 컨퍼런스 참석이에요.', pron: '아임 *히*어 포러 *비*즈니스 *칸*퍼런스', note: 'for a → "포러"로 이어서. for는 입술을 동그랗게 "포".' },
      { q: 'Business or holiday?', qKo: '출장이에요, 여행이에요?', a: 'Business.', aKo: '출장이요.', pron: '*비*즈니스' },
      { q: 'How long are you staying?', qKo: '얼마나 머무세요?', a: 'Five days.', aKo: '5일이요.', pron: '*파*이브 *데*이즈', note: 'days의 -s까지 분명하게.' },
      { q: 'Where are you staying?', qKo: '어디 묵으세요?', a: 'At the Kingston Hotel.', aKo: '킹스턴 호텔이요.', pron: '앳 더 *킹*스턴 호우*텔*', note: 'at 빠뜨리지 않기. Hotel은 뒤(텔)에 강세.' },
      { q: 'Have you been to Singapore before? / Is this your first visit to Singapore?', qKo: '싱가포르 와보셨어요? / 처음이세요?', a: "No, it's my third time.", aKo: '아니요, 세 번째예요.', pron: '*노*우, 잇츠 마이 *써*드 *타*임', note: 'third의 th: 혀끝을 윗니에 살짝 대고 바람을 내보내며 "써".' },
      { q: "What's the name of the conference?", qKo: '컨퍼런스 이름이 뭐예요?', a: "It's an AI conference. Here's my invitation.", aKo: 'AI 컨퍼런스예요. 초청장 여기 있어요.', pron: '잇츠 언 *에*이*아*이 *칸*퍼런스. 히어즈 마이 인비*테*이션' },
      { q: 'Who do you work for?', qKo: '어디서 일하세요?', a: 'I work for Metanet, a Korean IT company.', aKo: '한국 IT회사 메타넷이요.', pron: '아이 *워*크 포 *메*타넷, 어 코*리*언 *아*이*티* *컴*퍼니', note: 'work(워-r크, 혀를 말아서) ≠ walk(워크, 입을 크게).' },
      { q: 'When are you flying back?', qKo: '언제 돌아가세요?', a: 'On October second.', aKo: '10월 2일이요.', pron: '온 악*토*버 *세*컨드', note: '실제 귀국 날짜로 바꿔서 연습하세요.' },
      { q: 'Do you have a return ticket?', qKo: '귀국 항공권 있으세요?', a: 'Yes, here it is.', aKo: '네, 여기요.', pron: '*예*스, 히어리*티*즈', note: 'Here is it ✗ → Here it is ✓. 세 단어를 한 덩어리로.' },
      { q: 'Did you fill out the SG Arrival Card?', qKo: '입국카드 작성하셨어요?', a: 'Yes, I did it online.', aKo: '네, 온라인으로 했어요.', pron: '예스, 아이 *디*딧 온*라*인' },
      { q: 'Are you traveling alone?', qKo: '혼자 오셨어요?', a: "Yes, I am. / No, with my colleague.", aKo: '네, 혼자요. / 아니요, 동료랑요.', pron: '예스, 아이 *앰*. / 노우, 윋 마이 *칼*리그' },
      { q: 'Is anyone else traveling with you?', qKo: '동행자 있으세요?', a: "Yes, I'm traveling with three colleagues.", aKo: '네, 동료 세 명과 함께 왔어요.', pron: '예스, 아임 *트*래블링 윋 *쓰*리 *칼*리그즈', note: 'three(쓰리, th) + colleagues의 -s.' },
      { q: 'Do you have any checked baggage?', qKo: '위탁 수하물 있으세요?', a: 'Yes, I do.', aKo: '네, 있어요.', pron: '예스, 아이 *두*', note: 'Do로 물으면 Do로 답하기.' },
      { q: 'How many bags do you have?', qKo: '가방 몇 개 있으세요?', a: 'One bag.', aKo: '한 개요.', pron: '*원* *백*' },
      { q: "What's inside this bag?", qKo: '이 가방 안에 뭐가 있어요?', a: 'My clothes and cosmetics.', aKo: '제 옷이랑 화장품이에요.', pron: '마이 *클*로우즈 앤 카즈*메*틱스' },
      { q: 'Are you carrying any food or plants?', qKo: '음식이나 식물 가져오셨어요?', a: "No, I'm not.", aKo: '아니요.', pron: '노우, 아임 *낫*' },
      { q: 'Anything to declare?', qKo: '신고할 물건 있어요?', a: 'No, nothing.', aKo: '아니요, 없어요.', pron: '노우, *낫*띵' },
      { q: 'Do you have any electronic devices to declare?', qKo: '신고할 전자기기 있으세요?', a: "No, I don't.", aKo: '아니요, 없어요.', pron: '노우, 아이 *돈*(트)' },
      { q: 'How much cash are you carrying?', qKo: '현금 얼마나 갖고 계세요?', a: 'About one thousand dollars.', aKo: '약 천 달러요.', pron: '어*바*웃 *원* *싸*우전드 *달*러즈', note: 'thousand의 th + dollars의 -s.' },
      { q: 'Please step aside for a random check.', qKo: '무작위 검사가 있으니 옆으로 비켜주세요.', a: 'Okay.', aKo: '네.', pron: '오우*케*이' },
      { q: 'Look at the camera, please.', qKo: '카메라 봐주세요.', a: 'Okay.', aKo: '네.', pron: '오우*케*이' },
      { q: null, cue: '못 알아들었을 때', a: 'Sorry, could you say that again?', aKo: '죄송한데, 다시 말씀해 주시겠어요?', pron: '*쏘*리, 쿠쥬 *세*이 댓 어*겐*', note: 'could you → "쿠쥬"로 붙여서.' },
      { q: 'Enjoy your stay in Singapore.', qKo: '싱가포르에서 좋은 시간 보내세요.', a: 'Thanks a lot.', aKo: '감사합니다.', pron: '땡써*랏*' }
    ]
  },
  {
    id: 'taxi',
    icon: '🚕',
    title: '택시 / Grab',
    en: 'Taxi / Grab',
    role: '기사',
    tip: '공항 출구는 "Door + 번호"로. aircon은 에어컨의 일반 표현.',
    items: [
      { q: 'Where to?', qKo: '어디 가세요?', a: 'The Kingston Hotel, please.', aKo: '킹스턴 호텔이요.', pron: '더 *킹*스턴 호우*텔*, 플리즈' },
      { q: null, cue: '주소 보여줄 때', a: "Here's the address.", aKo: '여기 주소예요.', pron: '히어즈 디 *애*드레스' },
      { q: 'Any luggage?', qKo: '짐 있어요?', a: 'Yes, two bags.', aKo: '네, 가방 두 개요.', pron: '예스, *투* *백*즈', note: 'two bag ✗ → two bags ✓. luggage는 셀 수 없으니 two luggage ✗.' },
      { q: null, cue: '내가 먼저 — 트렁크 부탁', a: 'Could you open the trunk, please?', aKo: '트렁크 좀 열어주시겠어요?', pron: '쿠쥬 *오*우픈 더 *트*렁크, 플리즈' },
      { q: 'Are you Mr. Cho?', qKo: 'Grab 픽업 확인 — 조 선생님이세요?', a: "Yes, that's me.", aKo: '네, 저예요.', pron: '예스, *댓*츠 *미*' },
      { q: 'Where are you now?', qKo: 'Grab 기사가 전화 — 지금 어디 계세요?', a: "I'm at Door 3, Terminal 1.", aKo: '1터미널 3번 출구예요.', pron: '아임 앳 *도*어 *쓰*리, *터*미널 *원*' },
      { q: 'Which entrance? Front or side?', qKo: '정문이요, 옆문이요?', a: 'The main entrance, please.', aKo: '정문이요.', pron: '더 *메*인 *엔*트런스, 플리즈' },
      { q: null, cue: '소요시간 묻기', a: 'About how long to get there?', aKo: '얼마나 걸려요?', pron: '어바웃 *하*우 *롱* 투 겟 *데*어' },
      { q: "Traffic's quite bad now.", qKo: '지금 좀 막혀요.', a: "That's okay. No rush.", aKo: '괜찮아요. 급하지 않아요.', pron: '댓츠 오우*케*이. 노우 *러*쉬' },
      { q: null, cue: '에어컨 조절', a: 'Could you turn down the aircon a bit?', aKo: '에어컨 좀 약하게 해주시겠어요?', pron: '쿠쥬 턴 *다*운 디 *에*어컨 어 *빗*' },
      { q: 'Is this your first time here?', qKo: '여기 처음이에요?', a: "No, it's my third time.", aKo: '세 번째예요.', pron: '*노*우, 잇츠 마이 *써*드 *타*임', note: 'third의 th: 혀끝을 윗니에 살짝 대고 "써".' },
      { q: null, cue: '결제', a: 'Can I pay by card?', aKo: '카드 돼요?', pron: '캐나이 *페*이 바이 *카*드' },
      { q: "There's a surcharge for card.", qKo: '카드는 수수료 붙어요.', a: "That's fine.", aKo: '괜찮아요.', pron: '댓츠 *파*인' },
      { q: null, cue: '내릴 곳', a: 'You can drop me here.', aKo: '여기서 내려주세요.', pron: '유 큰 *드*랍 미 *히*어' },
      { q: null, cue: '내리며', a: 'Keep the change. Thanks!', aKo: '잔돈은 괜찮아요. 감사합니다!', pron: '*킵* 더 *체*인지. *땡*스' }
    ]
  },
  {
    id: 'hotel',
    icon: '🏨',
    title: '호텔 체크인·체류',
    en: 'Hotel',
    role: '직원',
    tip: '예약자 이름은 "under + 성"으로. 방 번호 문제는 "My room is 1205." 처럼 번호부터.',
    items: [
      { q: 'Checking in?', qKo: '체크인하세요?', a: 'Yes, I have a reservation under Cho.', aKo: '네, 조로 예약했어요.', pron: '예스, 아이 해버 레저*베*이션 언더 *조*' },
      { q: 'May I see your passport?', qKo: '여권 볼 수 있을까요?', a: 'Sure, here you go.', aKo: '네, 여기요.', pron: '*슈*어, 히어 유 *고*우' },
      { q: 'We need a deposit on your card.', qKo: '카드로 보증금 걸게요.', a: 'Okay. How much is it?', aKo: '네, 얼마예요?', pron: '오우*케*이. 하우 *머*치즈잇' },
      { q: "Your room isn't ready yet.", qKo: '방이 아직 준비 안 됐어요.', a: 'Can I leave my bags here?', aKo: '짐 좀 맡길 수 있을까요?', pron: '캐나이 *리*브 마이 *백*즈 히어', note: 'leave(리-브, 길게) ≠ live(리브, 짧게).' },
      { q: "We'll text you when it's ready.", qKo: '준비되면 문자 드릴게요.', a: "I don't have a local number. Can you use WhatsApp?", aKo: '현지 번호가 없어요. 왓츠앱 되나요?', pron: '아이 돈 해버 *로*우컬 *넘*버. 캔 유 *유*즈 *왓*챕' },
      { q: 'Any room preference?', qKo: '원하는 방 있으세요?', a: 'A high floor with a city view, if possible.', aKo: '가능하면 고층 시티뷰로요.', pron: '어 *하*이 *플*로어 위더 *씨*티 *뷰*, 이프 *파*서블' },
      { q: null, cue: '조식 시간', a: 'What time is breakfast?', aKo: '조식 몇 시예요?', pron: '왓 *타*임 이즈 *브*렉퍼스트' },
      { q: null, cue: '조식 장소', a: 'Where is breakfast served?', aKo: '조식은 어디서 해요?', pron: '*웨*어 이즈 *브*렉퍼스트 *서*브드' },
      { q: null, cue: '와이파이', a: "What's the Wi-Fi password?", aKo: '와이파이 비번이 뭐예요?', pron: '왓츠 더 *와*이파이 *패*스워드' },
      { q: null, cue: '체크아웃 시간', a: 'What time is check-out?', aKo: '체크아웃 몇 시예요?', pron: '왓 *타*임 이즈 *체*카웃' },
      { q: null, cue: '레이트 체크아웃', a: 'Could I get a late check-out?', aKo: '늦게 체크아웃해도 될까요?', pron: '쿠다이 게러 *레*잇 *체*카웃' },
      { q: null, cue: '카드키 문제', a: "My key card isn't working.", aKo: '카드키가 안 돼요.', pron: '마이 *키* 카드 *이*즌트 *워*킹' },
      { q: null, cue: '수건 요청', a: 'Could I get some extra towels?', aKo: '수건 좀 더 주시겠어요?', pron: '쿠다이 겟 썸 *엑*스트라 *타*월즈', note: 'towels의 -s.' },
      { q: null, cue: '에어컨 고장', a: "The aircon in my room isn't working.", aKo: '방 에어컨이 안 돼요.', pron: '디 *에*어컨 인 마이 *룸* 이즌트 *워*킹' },
      { q: null, cue: '체크아웃 후 짐 보관', a: 'Can you keep my bags until 6 p.m.?', aKo: '6시까지 짐 좀 맡아주실래요?', pron: '캔 유 *킵* 마이 *백*즈 언틸 *식*스 *피*-*엠*' }
    ]
  },
  {
    id: 'restaurant',
    icon: '🍽️',
    title: '식당 (일반)',
    en: 'Restaurant',
    role: '직원',
    tip: '메뉴판의 "++"는 봉사료 10%+GST 별도. 팁은 따로 안 줘도 됨.',
    items: [
      { q: 'How many?', qKo: '몇 분이세요?', a: 'Two, please.', aKo: '두 명이요.', pron: '*투*, 플리즈' },
      { q: 'Do you have a booking?', qKo: '예약하셨어요?', a: "No, we don't. Is there a wait?", aKo: '아니요. 기다려야 해요?', pron: '노우, 위 *돈*. 이즈 데어러 *웨*잇', note: 'Do로 물으면 Do로 답하기.' },
      { q: 'About 20 minutes.', qKo: '20분 정도요.', a: "That's fine. We'll wait.", aKo: '괜찮아요. 기다릴게요.', pron: '댓츠 *파*인. 윌 *웨*잇' },
      { q: 'Indoor or outdoor?', qKo: '실내요, 야외요?', a: 'Indoor, please.', aKo: '실내요.', pron: '*인*도어, 플리즈' },
      { q: 'Can I get you any drinks?', qKo: '음료 드릴까요?', a: 'Just water, please.', aKo: '물이면 돼요.', pron: '저스트 *워*러, 플리즈', note: 'water → 미국식 "워러".' },
      { q: 'Still or sparkling?', qKo: '일반 물이요, 탄산수요?', a: 'Still is fine.', aKo: '일반 물이요.', pron: '*스*틸 이즈 *파*인' },
      { q: null, cue: '추천 물어보기', a: 'What do you recommend?', aKo: '뭐가 맛있어요?', pron: '와루유 레커*멘*드' },
      { q: null, cue: '양 확인', a: 'Is this enough for two?', aKo: '두 명이 먹기 충분해요?', pron: '이즈 디스 이*너*프 포 *투*' },
      { q: null, cue: '맵기', a: 'Is it spicy? / Less spicy, please.', aKo: '매워요? / 덜 맵게 해주세요.', pron: '이즈 잇 *스*파이시? / *레*스 스파이시, 플리즈' },
      { q: 'Ready to order?', qKo: '주문하시겠어요?', a: "Yes, we'll have this and this, please.", aKo: '이거랑 이거 주세요.', pron: '예스, 윌 해브 *디*스 앤 *디*스, 플리즈' },
      { q: "How's everything?", qKo: '식사 괜찮으세요?', a: "Everything's great, thanks.", aKo: '다 좋아요.', pron: '*에*브리띵즈 *그*레잇, 땡스' },
      { q: null, cue: '추가 주문', a: 'Could we get one more, please?', aKo: '하나 더 주시겠어요?', pron: '쿠드 위 겟 *원* *모*어, 플리즈' },
      { q: null, cue: '포장', a: 'Can I get this to go?', aKo: '이거 포장돼요?', pron: '캐나이 겟 디스 투 *고*우' },
      { q: null, cue: '계산', a: 'Can we get the bill, please?', aKo: '계산서 주시겠어요?', pron: '캔 위 겟 더 *빌*, 플리즈' },
      { q: null, cue: '나눠 계산', a: 'Can we split the bill?', aKo: '따로 계산 돼요?', pron: '캔 위 *스*플릿 더 *빌*' }
    ]
  },
  {
    id: 'jumbo',
    icon: '🦀',
    title: '점보 씨푸드',
    en: 'Jumbo Seafood',
    role: '직원',
    tip: '땅콩·물수건이 자동으로 나오고 요금이 붙기도 함 — 원치 않으면 "No peanuts, thanks." 크랩은 무게 따라 가격 차이가 크니 주문 전 1킬로 가격 꼭 확인.',
    items: [
      { q: 'Do you have a reservation?', qKo: '예약하셨어요?', a: 'Yes, under Cho, for two at seven.', aKo: '네, 조로 7시에 두 명이요.', pron: '예스, 언더 *조*, 포 *투* 앳 *세*븐', note: 'at seven — at 빠뜨리지 않기.' },
      { q: null, cue: '예약 없을 때', a: 'How long is the wait?', aKo: '얼마나 기다려야 해요?', pron: '하우 *롱* 이즈 더 *웨*잇' },
      { q: "Here's your queue number.", qKo: '대기번호예요.', a: 'Thanks. Will you call us?', aKo: '감사해요. 불러주시나요?', pron: '땡스. 윌 유 *콜* 어스' },
      { q: null, cue: '크랩 가격', a: 'How much is the crab today?', aKo: '오늘 크랩 가격이 얼마예요?', pron: '하우 *머*치즈 더 *크*랩 투*데*이' },
      { q: "It's seasonal price, by weight.", qKo: '시가, 무게로 계산해요.', a: 'How much for one kilo?', aKo: '1킬로에 얼마예요?', pron: '하우 머치 포 *원* *킬*로우' },
      { q: null, cue: '크기 확인', a: 'How big is the crab? Is it enough for two?', aKo: '얼마나 커요? 두 명 충분해요?', pron: '하우 *빅* 이즈 더 크랩? 이즈 잇 이*너*프 포 *투*' },
      { q: 'Chili or black pepper?', qKo: '칠리요, 블랙페퍼요?', a: 'Chili crab, please.', aKo: '칠리크랩이요.', pron: '*칠*리 크랩, 플리즈' },
      { q: null, cue: '맵기 확인', a: 'Is the chili crab very spicy?', aKo: '칠리크랩 많이 매워요?', pron: '이즈 더 칠리 크랩 *베*리 *스*파이시', note: 'very의 v: 윗니로 아랫입술을 살짝 물고 "v".' },
      { q: 'Would you like some mantou?', qKo: '만터우 드릴까요?', a: 'Yes, six fried mantou, please.', aKo: '네, 튀긴 만터우 6개요.', pron: '예스, *식*스 *프*라이드 *만*토우, 플리즈' },
      { q: 'Any other dishes?', qKo: '다른 요리는요?', a: 'Some fried rice and cereal prawns, please.', aKo: '볶음밥이랑 시리얼 새우 주세요.', pron: '썸 *프*라이드 *라*이스 앤 *씨*리얼 *프*론즈, 플리즈', note: 'rice의 r: 혀를 말아서. lice(이)와 구분. prawns의 -s.' },
      { q: null, cue: '소요시간', a: 'How long will the crab take?', aKo: '크랩 얼마나 걸려요?', pron: '하우 *롱* 윌 더 크랩 *테*익' },
      { q: null, cue: '냅킨', a: 'Could I get some more napkins?', aKo: '냅킨 좀 더 주시겠어요?', pron: '쿠다이 겟 썸 *모*어 *냅*킨즈', note: 'napkin ✗ → napkins ✓.' },
      { q: null, cue: '장갑·도구', a: 'Could we get some gloves, please?', aKo: '장갑 좀 주시겠어요?', pron: '쿠드 위 겟 썸 *글*러브즈, 플리즈' },
      { q: null, cue: '소스용 만터우 추가', a: 'Could we get more mantou for the sauce?', aKo: '소스 찍을 만터우 더 주세요.', pron: '쿠드 위 겟 *모*어 *만*토우 포 더 *쏘*스' },
      { q: null, cue: '물수건 확인', a: 'Are the wet towels free?', aKo: '물수건 무료예요?', pron: '아 더 *웻* 타월즈 *프*리', note: 'free의 f: 윗니로 아랫입술을 살짝 물고 "f".' },
      { q: null, cue: '계산', a: 'Can we get the bill, please?', aKo: '계산서 주세요.', pron: '캔 위 겟 더 *빌*, 플리즈' }
    ]
  },
  {
    id: 'core10',
    icon: '⭐',
    title: '매일 반복할 핵심 10문장',
    en: 'Core 10',
    role: '상황',
    tip: '하루 10분, 소리 내어 20번씩 반복.',
    items: [
      { q: null, cue: '방문 목적', a: "I'm here for a business conference.", aKo: '출장, 컨퍼런스 참석이에요.', pron: '아임 *히*어 포러 *비*즈니스 *칸*퍼런스' },
      { q: null, cue: '숙소', a: "I'll be staying at the Kingston Hotel.", aKo: '킹스턴 호텔에 묵을 거예요.', pron: '아일 비 *스*테잉 앳 더 *킹*스턴 호우*텔*', note: 'staying at — at 빠뜨리지 않기.' },
      { q: null, cue: '방문 횟수', a: "No, it's my third time.", aKo: '아니요, 세 번째예요.', pron: '*노*우, 잇츠 마이 *써*드 *타*임' },
      { q: null, cue: '택시 목적지', a: 'To the Kingston Hotel, please.', aKo: '킹스턴 호텔로 가주세요.', pron: '투 더 *킹*스턴 호우*텔*, 플리즈' },
      { q: null, cue: '짐 개수', a: 'Yes, two bags, please.', aKo: '네, 가방 두 개요.', pron: '예스, *투* *백*즈, 플리즈' },
      { q: null, cue: '물건 건넬 때', a: 'Here it is.', aKo: '여기요.', pron: '히어리*티*즈', note: 'Here is it ✗ → Here it is ✓.' },
      { q: null, cue: '현지 번호 없음', a: "I don't have a local number. Can you use WhatsApp?", aKo: '현지 번호가 없어요. 왓츠앱 되나요?', pron: '아이 돈 해버 *로*우컬 *넘*버. 캔 유 *유*즈 *왓*챕' },
      { q: null, cue: '물 주문', a: "I'd like some water, please.", aKo: '물 주세요.', pron: '아이드 *라*익 썸 *워*러, 플리즈', note: 'I like ✗ → I\'d like ✓. "아이드 라이크"로 붙여서 짧게.' },
      { q: null, cue: '계산', a: 'Could I get the bill, please?', aKo: '계산서 주시겠어요?', pron: '쿠다이 겟 더 *빌*, 플리즈' },
      { q: null, cue: '크랩 크기', a: 'How big is the crab? Is it enough for two?', aKo: '크랩 얼마나 커요? 두 명 충분해요?', pron: '하우 *빅* 이즈 더 크랩? 이즈 잇 이*너*프 포 *투*' }
    ]
  }
];

// 원본 스크립트의 "자주 틀리는 부분 체크리스트"
const CHECKLIST = [
  { t: '복수형 -s 빠짐', d: 'two bag → two bag<b>s</b>, steak → steak<b>s</b>, napkin → napkin<b>s</b>' },
  { t: 'I like → I\'d like', d: '"아이드 라이크"로 붙여서 짧게' },
  { t: 'work/walk, lead/need 발음 혼동', d: '주의' },
  { t: 'at 빠뜨리기', d: 'staying <b>at</b> the hotel, <b>at</b> seven' },
  { t: '어순', d: 'Here is it ✗ → Here it is ✓ / pick up later ✗ → pick <b>them</b> up later ✓' },
  { t: 'Do로 묻고 Do로 답하기', d: 'Do you have…? → Yes, I do. / No, we don\'t.' },
  { t: 'luggage는 셀 수 없음', d: 'two luggage ✗ → two bags ✓' },
  { t: 'for 발음', d: '"부엌"이 아니라 "포"(입술을 동그랗게)' }
];

// 각 카드에 고유 id 부여 (학습 기록 저장용)
SCENES.forEach(scene => {
  scene.items.forEach((item, i) => { item.id = `${scene.id}-${i}`; });
});
