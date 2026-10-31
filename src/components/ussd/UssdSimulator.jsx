import { useMemo, useState } from 'react';
import { ArrowLeft, BatteryMedium, Delete, Globe2, Info, Phone, Signal, Wifi } from 'lucide-react';
import marketSnapshot from '@/data/ussd-market-prices.json';
import { useObservations } from '@/hooks/useObservations';
import { useWeather } from '@/hooks/useWeather';
import { CROPS, cropLabel, DISTRICT_NAMES } from '@/lib/constants';
import { VERIFIED_COOPERATIVES, VERIFIED_OPPORTUNITIES } from '@/lib/community-data';

const DEMO_CODE = '*000#';
const PAGE_SIZE = 4;
const COPY = {
  en: {
    title: 'AgriWiser',
    chooseLanguage: 'Choose language / Hitamo ururimi',
    mainPrompt: 'Choose a service:',
    marketPrice: 'Market prices',
    inputSupport: 'Find farmer support',
    cropInfo: 'Crop information',
    weatherInfo: 'Recent weather',
    localHelp: 'Get help with a problem',
    exit: 'Exit',
    chooseDistrict: 'Choose a district:',
    chooseCrop: 'Choose a crop:',
    next: 'More districts',
    back: 'Back',
    send: 'Send',
    enterChoice: 'Enter a number',
    sessionTitle: 'USSD session · Demo',
    noPrice: 'No price record is available for that selection in this snapshot.',
    latestMedian: 'Last reported median retail price',
    reportDate: 'Report date',
    markets: 'markets',
    historical: 'Historical record, not today’s offer.',
    priceChoices: '1. Another crop\n2. Another district\n0. Main menu',
    supportText: 'For subsidized seeds or fertilizer, ask your Sector Agronomist or an authorized agro-dealer. Ask if enrollment is open and what documents to bring. SNS code: *774#. This demo cannot check eligibility or register you.',
    supportPrompt: 'Choose the support you need:',
    subsidy: 'Seed and fertilizer subsidy',
    insurance: 'Crop insurance',
    training: 'Training and grants',
    cooperatives: 'Cooperatives and buyers',
    supportNoMatch: 'No cooperative is listed for this district. Ask your Sector Agricultural Office for a current referral.',
    supportCrops: 'Crops',
    supportContact: 'Ask at',
    supportVerify: 'Programs and dates can change. Confirm locally before travelling. This demo cannot enroll you.',
    backHint: '0 Back · * Main menu',
    supportSteps: '1. Ask your Sector Agronomist if the program is open for your crop and season. 2. Ask which documents are required. 3. Use the official SNS process (*774#) or an authorized agro-dealer. Never share your PIN. This demo does not register you.',
    helpText: 'What do you need help with? 1. Pest or crop problem 2. Weather or water 3. Seeds or fertilizer 4. Selling a crop 0. Main menu',
    helpPest: 'Tell your Sector Agronomist the crop, affected area, when it started, and what you observed. Do not guess a pesticide dose. This demo does not send a report.',
    helpWater: 'Check current field conditions and ask your Sector Agronomist for local advice. This demo shows recent historical weather only, not a forecast, and does not send a request.',
    helpInputs: 'Ask your Sector Agronomist or an authorized agro-dealer about availability and current enrollment. Smart Nkunganire: *774#. This demo cannot register you.',
    helpSelling: 'Check the price date and unit, then compare with a buyer’s offer at your local market. WFP figures here are historical references, not guaranteed offers.',
    cropStatsPrompt: 'Choose a district:',
    chooseMeasure: 'Choose a figure:',
    weatherPrompt: 'Choose a district for the last 14 complete days:',
    weatherDisclaimer: 'Recent historical estimates, not a forecast. Grid data may differ from conditions on your farm.',
    noWeather: 'Weather data is temporarily unavailable. Try later or ask your local extension officer.',
    noCropData: 'No published figure was found for that selection. Try another crop, district, or season.',
    loginForData: 'Sign in and open this service in the Public Insights workspace to read published crop and weather records.',
    production: 'Production (tonnes)',
    area: 'Harvested area (hectares)',
    yield: 'Reported yield',
    rainfall: 'Rainfall total',
    meanTemperature: 'Mean temperature',
    validDays: 'days with data',
    period: 'Period',
    sourceLabel: 'Source',
    tryAgain: '1. Try another district\n0. Main menu',
    ended: 'Thank you. The demo session has ended.',
    restart: 'Start again',
    invalid: 'That choice is not available. Enter one of the numbers shown.',
    invalidCode: `Demo only: enter ${DEMO_CODE}. No call will be placed.`,
    cancel: 'Cancel session',
    source: 'WFP Price Database via HDX',
    tryCode: `Demo code: ${DEMO_CODE}`,
    noLiveCall: 'Simulation only · no phone call is placed',
    backToDialer: 'Back to keypad',
    demoNote: 'This interactive browser demo uses a small, bundled historical price snapshot. It does not connect to a telecom network or SNS.',
    liveNote: 'Farmers without mobile internet use the real service by dialing an approved USSD code. The simulator is for previewing the experience; a live code needs a telecom gateway and partner approval.',
    availableData: 'Price lookup uses a bundled historical snapshot. Inside the signed-in Public Insights workspace, crop figures come from published NISR records and recent historical weather comes from NASA POWER. No forecast, live price feed, or submitted problem report is available.',
    howItWorks: 'Try the phone',
    howStep1: `Enter ${DEMO_CODE} on the keypad and press the green call button.`,
    howStep2: 'Choose English or Kinyarwanda, then follow the numbered menus.',
    howStep3: 'Use the keypad or type a number. 0 goes back; * returns to the main menu.',
    dataHeading: 'What this demo can answer',
    dataCopy: 'Check a dated market-price reference, follow the steps for input support, read published crop figures, view recent weather history, or get a practical next step for a farm problem.',
    historicalLabel: 'Historical prices',
    serviceLabel: 'General guidance',
    kinyarwanda: 'Kinyarwanda',
    english: 'English',
    cropNames: { Maize: 'Maize', 'Beans (dry)': 'Dry beans', 'Rice (local)': 'Local rice', 'Potatoes (Irish)': 'Irish potatoes' },
  },
  rw: {
    title: 'AgriWiser',
    chooseLanguage: 'Hitamo ururimi:',
    mainPrompt: 'Hitamo serivisi:',
    marketPrice: 'Reba ibiciro ku isoko',
    inputSupport: 'Shaka serivisi z’ubuhinzi',
    localHelp: 'Shaka ubufasha mu buhinzi',
    cropInfo: 'Imibare y’ibihingwa',
    weatherInfo: 'Ikirere giheruka',
    exit: 'Sohoka',
    chooseDistrict: 'Hitamo akarere:',
    chooseCrop: 'Hitamo igihingwa:',
    next: 'Andi turere',
    back: 'Subira inyuma',
    send: 'Ohereza',
    enterChoice: 'Andika umubare',
    sessionTitle: 'Ikiganiro cya USSD · Demo',
    noPrice: 'Nta giciro cyabonetse muri iyi ngero ku byo wahisemo.',
    latestMedian: 'Igiciro mpuzandengo giheruka cyatangajwe',
    reportDate: 'Itariki cyatangajweho',
    markets: 'amasoko',
    historical: 'Ni igiciro cyo mu mateka, si icy’uyu munsi.',
    priceChoices: '1. Ikindi gihingwa\n2. Hitamo akandi karere\n0. Ibikubiyemo',
    supportText: 'Ku mbuto cyangwa ifumbire bya nkunganire, baza agronome w’Umurenge cyangwa umucuruzi wemewe. Baza niba kwiyandikisha byatangiye n’inyandiko usabwa. Kode ya SNS: *774#. Iyi demo ntigenzura uburenganzira cyangwa ngo ikwiyandikishe.',
    supportPrompt: 'Hitamo ubufasha ukeneye:',
    subsidy: 'Inkunga y’imbuto n’ifumbire',
    insurance: 'Ubwishingizi bw’imyaka',
    training: 'Amahugurwa n’inkunga',
    cooperatives: 'Koperative n’abaguzi',
    supportNoMatch: 'Nta koperative iri kuri uru rutonde muri aka karere. Baza ibiro by’ubuhinzi by’Akarere biguhe amakuru agezweho.',
    supportCrops: 'Ibihingwa',
    supportContact: 'Baza kuri',
    supportVerify: 'Gahunda n’amatariki birahinduka. Banza ubyemeze aho utuye. Iyi demo ntikwiyandikisha.',
    backHint: '0 Subira inyuma · * Ibikubiyemo',
    supportSteps: '1. Baza agronome niba gahunda yatangiye ku gihingwa n’igihembwe cyawe. 2. Baza inyandiko usabwa. 3. Koresha SNS (*774#) cyangwa umucuruzi wemewe. Ntugatange PIN yawe. Iyi demo ntikwiyandikisha.',
    helpText: 'Ni iki ushaka gufashwamo? 1. Udukoko cyangwa indwara 2. Ikirere cyangwa amazi 3. Imbuto cyangwa ifumbire 4. Kugurisha umusaruro 0. Ibikubiyemo',
    helpPest: 'Bwira agronome w’Umurenge igihingwa, aho byafashe, igihe byatangiriye n’ibyo wabonye. Ntukeke igipimo cy’umuti. Iyi demo ntitanga raporo.',
    helpWater: 'Reba uko umurima umeze, ubaze agronome w’Umurenge. Iyi demo yerekana ikirere cyo mu bihe byashize gusa, si iteganyagihe, kandi ntitanga ubusabe.',
    helpInputs: 'Baza agronome w’Umurenge cyangwa umucuruzi wemewe niba imbuto/ifumbire bihari n’uko wakwiyandikisha. Smart Nkunganire: *774#. Iyi demo ntikwiyandikisha.',
    helpSelling: 'Reba itariki n’igipimo cy’igiciro, ubigereranye n’icyo umuguzi aguha ku isoko. Ibiciro bya WFP ni ibyo mu bihe byashize, si isezerano ry’igiciro.',
    cropStatsPrompt: 'Hitamo akarere:',
    chooseMeasure: 'Hitamo imibare:',
    weatherPrompt: 'Hitamo akarere urebe iminsi 14 ishize yuzuye:',
    weatherDisclaimer: 'Ni igereranya ry’ikirere cyo mu bihe byashize, si iteganyagihe. Amakuru y’uturere ashobora kutangana n’ikirere cyo mu murima wawe.',
    noWeather: 'Amakuru y’ikirere ntaboneka ubu. Ongera ugerageze nyuma cyangwa ubaze agronome.',
    noCropData: 'Nta mibare yatangajwe yabonetse kuri ibyo wahisemo. Gerageza ikindi gihingwa, akarere cyangwa igihembwe.',
    loginForData: 'Injira muri konti ufungure iyi serivisi muri Public Insights kugira ngo urebe imibare n’ikirere byatangajwe.',
    production: 'Umusaruro (toni)',
    area: 'Ubuso bwasaruwe (hegitari)',
    yield: 'Umusaruro kuri hegitari watangajwe',
    rainfall: 'Imvura yose',
    meanTemperature: 'Ubushyuhe mpuzandengo',
    validDays: 'iminsi ifite amakuru',
    period: 'Igihe',
    sourceLabel: 'Inkomoko',
    tryAgain: '1. Hitamo akandi karere\n0. Ibikubiyemo',
    ended: 'Murakoze. Ikiganiro cya demo kirangiye.',
    restart: 'Ongera utangire',
    invalid: 'Icyo wahisemo ntikiboneka. Andika umwe mu mibare yerekanwe.',
    invalidCode: `Demo gusa: andika ${DEMO_CODE}. Nta guhamagara gukorwa.`,
    cancel: 'Hagarika ikiganiro',
    source: 'WFP Price Database via HDX',
    tryCode: `Kode ya demo: ${DEMO_CODE}`,
    noLiveCall: 'Ni igishushanyo · nta guhamagara gukorwa',
    backToDialer: 'Subira kuri keypad',
    demoNote: 'Iyi demo ikorerwa muri browser ikoresha amakuru mato y’ibiciro byo mu bihe byashize. Ntabwo ihuza n’umuyoboro wa telefoni cyangwa SNS.',
    liveNote: 'Abahinzi badafite internet kuri telefoni bakoresha serivisi nyakuri bahamagara kode ya USSD yemejwe. Iyi demo igaragaza uko serivisi yaba imeze; kode nyakuri isaba ubufatanye n’umuheza w’itumanaho n’abafatanyabikorwa.',
    availableData: 'Ibiciro bikomoka ku makuru mato yo mu bihe byashize. Muri Public Insights winjiyemo, imibare y’ibihingwa iva muri NISR, naho ikirere giheruka kikava muri NASA POWER. Nta iteganyagihe, giciro cya none cyangwa raporo yoherezwa biboneka.',
    howItWorks: 'Uko wakoresha telefoni',
    howStep1: `Andika ${DEMO_CODE} kuri keypad ukande buto y’icyatsi yo guhamagara.`,
    howStep2: 'Hitamo Ikinyarwanda cyangwa Icyongereza, ukurikize imibare iri kuri menu.',
    howStep3: 'Koresha keypad cyangwa wandike umubare. 0 isubira inyuma; * igusubiza ku bikubiyemo.',
    dataHeading: 'Ibyo iyi demo igufasha kubona',
    dataCopy: 'Reba igiciro gifite itariki, umenye uko wasaba inkunganire, urebe imibare y’ibihingwa yatangajwe, ikirere giheruka, cyangwa intambwe wakurikiza ku kibazo cyo mu murima.',
    historicalLabel: 'Ibiciro byo mu bihe byashize',
    serviceLabel: 'Amakuru rusange',
    kinyarwanda: 'Kinyarwanda',
    english: 'English',
    cropNames: { Maize: 'Ibigori', 'Beans (dry)': 'Ibishyimbo byumye', 'Rice (local)': 'Umuceri waho', 'Potatoes (Irish)': 'Ibirayi' },
  },
};

const digits = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ['*', ''], ['0', '+'], ['#', ''],
];

const districts = [...new Set(marketSnapshot.entries.map((item) => item.district))].sort((a, b) => a.localeCompare(b));
const PAGE_DISTRICTS = DISTRICT_NAMES;
const PAGE_CROPS = CROPS.filter((crop) => !String(crop).includes('subtype'));
const SUPPORT_PROGRAM_IDS = {
  '1': 'opp-rab-seed-subsidy',
  '2': 'opp-nais-insurance',
  '3': 'opp-ffs-climate-training',
};
const DAY_MS = 24 * 60 * 60 * 1000;

function previousFourteenDays() {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - DAY_MS);
  const start = new Date(end.getTime() - 13 * DAY_MS);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function PhoneKey({ value, letters, onClick, disabled = false }) {
  return (
    <button
      type="button"
      aria-label={letters ? `${value}, ${letters}` : value}
      onClick={() => onClick(value)}
      disabled={disabled}
      className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 disabled:opacity-40 sm:h-[62px] sm:w-[62px]"
    >
      <span className="text-[25px] leading-none">{value}</span>
      <span className="mt-0.5 h-3 text-[8px] font-bold tracking-[0.18em] text-zinc-300">{letters}</span>
    </button>
  );
}

export function UssdSimulator({ embedded = false } = {}) {
  const [phonePhase, setPhonePhase] = useState('dialer');
  const [view, setView] = useState('language');
  const [language, setLanguage] = useState('en');
  const [code, setCode] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [districtPage, setDistrictPage] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('production');
  const [districtMenuPage, setDistrictMenuPage] = useState(0);
  const [cropMenuPage, setCropMenuPage] = useState(0);
  const [selectedWeatherDistrict, setSelectedWeatherDistrict] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const copy = COPY[language];

  const cropOptions = useMemo(
    () => marketSnapshot.entries.filter((item) => item.district === selectedDistrict).map((item) => item.crop).sort((a, b) => a.localeCompare(b)),
    [selectedDistrict],
  );
  const selectedPrice = marketSnapshot.entries.find((item) => item.district === selectedDistrict && item.crop === selectedCrop);
  const selectedProgram = VERIFIED_OPPORTUNITIES.find((item) => item.id === selectedService);
  const districtCooperatives = VERIFIED_COOPERATIVES.filter((item) => item.district === selectedDistrict);
  const selectedCooperative = districtCooperatives.find((item) => item.id === selectedService);
  const statDistrictPage = PAGE_DISTRICTS.slice(districtMenuPage * PAGE_SIZE, districtMenuPage * PAGE_SIZE + PAGE_SIZE);
  const statCropPage = PAGE_CROPS.slice(cropMenuPage * PAGE_SIZE, cropMenuPage * PAGE_SIZE + PAGE_SIZE);
  const weatherPeriod = useMemo(() => previousFourteenDays(), [selectedWeatherDistrict]);
  const cropObservations = useObservations({
    domain: 'crop', crop: selectedCrop, district: selectedDistrict,
    enabled: embedded && phonePhase === 'session' && view === 'crop-stat-result',
    view: 'full',
  });
  const weatherResult = useWeather({
    location: { district: selectedWeatherDistrict }, ...weatherPeriod,
  }, { enabled: embedded && phonePhase === 'session' && view === 'weather-result' && Boolean(selectedWeatherDistrict) });
  const metricIndicator = selectedMetric === 'yield' ? 'reported_yield' : selectedMetric;
  const publishedStat = (cropObservations.data ?? [])
    .filter((item) => item.indicator === metricIndicator && item.value !== null && Number.isFinite(Number(item.value)) && item.observation_status !== 'missing' && !item.is_demo)
    .sort((a, b) => Number(b.year) - Number(a.year) || String(b.season).localeCompare(String(a.season)))[0];

  function pushView(next) {
    setHistory((items) => [...items, view]);
    setView(next);
    setReply('');
    setError('');
  }

  function backToPrevious() {
    setError('');
    setReply('');
    if (!history.length) {
      setPhonePhase('dialer');
      setView('language');
      return;
    }
    setView(history.at(-1));
    setHistory(history.slice(0, -1));
  }

  function startSession() {
    if (code !== DEMO_CODE) {
      setError(copy.invalidCode);
      return;
    }
    setPhonePhase('session');
    setView('language');
    setHistory([]);
    setReply('');
    setError('');
    setDistrictPage(0);
  }

  function endSession() {
    setView('ended');
    setHistory([]);
    setReply('');
    setError('');
    setSelectedDistrict('');
    setSelectedCrop('');
    setSelectedWeatherDistrict('');
  }

  function resetPhone() {
    setPhonePhase('dialer');
    setView('language');
    setHistory([]);
    setCode('');
    setReply('');
    setError('');
    setSelectedDistrict('');
    setSelectedCrop('');
  }

  function appendKey(value) {
    if (phonePhase === 'dialer') {
      setError('');
      setCode((current) => (current + value).slice(0, 12));
      return;
    }
    if (view === 'ended') return;
    if (/^\d$/.test(value) || value === '*') setReply((current) => (current + value).slice(0, 2));
  }

  function deleteKey() {
    if (phonePhase === 'dialer') setCode((current) => current.slice(0, -1));
    else setReply((current) => current.slice(0, -1));
    setError('');
  }

  function handleChoice(raw) {
    const choice = String(raw ?? '').trim();
    setReply('');
    setError('');
    if (!choice) return;

    if (choice === '*' && phonePhase === 'session' && view !== 'ended') {
      setView('main');
      setHistory(['language']);
      setSelectedDistrict('');
      setSelectedCrop('');
      setSelectedService('');
      setSelectedWeatherDistrict('');
      setDistrictMenuPage(0);
      setCropMenuPage(0);
      return;
    }

    if (view === 'language') {
      if (choice === '1') { setLanguage('rw'); pushView('main'); }
      else if (choice === '2') { setLanguage('en'); pushView('main'); }
      else setError(COPY.en.invalid);
      return;
    }

    if (view === 'main') {
      if (choice === '1') { setDistrictPage(0); pushView('price-district'); }
      else if (choice === '2') pushView('support');
      else if (choice === '3') { setDistrictMenuPage(0); setCropMenuPage(0); pushView('crop-stat-district'); }
      else if (choice === '4') { setDistrictMenuPage(0); pushView('weather-district'); }
      else if (choice === '5') pushView('help-menu');
      else if (choice === '0') endSession();
      else setError(copy.invalid);
      return;
    }

    if (view === 'price-district') {
      const start = districtPage * PAGE_SIZE;
      const pageDistricts = districts.slice(start, start + PAGE_SIZE);
      if (choice === '0') { backToPrevious(); return; }
      if (choice === '5' && start + PAGE_SIZE < districts.length) {
        setDistrictPage((page) => page + 1);
        return;
      }
      const index = Number(choice) - 1;
      const district = pageDistricts[index];
      if (!district) { setError(copy.invalid); return; }
      setSelectedDistrict(district);
      pushView('price-crop');
      return;
    }

    if (view === 'price-crop') {
      if (choice === '0') { backToPrevious(); return; }
      const crop = cropOptions[Number(choice) - 1];
      if (!crop) { setError(copy.invalid); return; }
      setSelectedCrop(crop);
      pushView('price-result');
      return;
    }

    if (view === 'support') {
      if (choice === '1') { setSelectedService(SUPPORT_PROGRAM_IDS['1']); pushView('support-program'); }
      else if (choice === '2') { setSelectedService(SUPPORT_PROGRAM_IDS['2']); pushView('support-program'); }
      else if (choice === '3') { setSelectedService(SUPPORT_PROGRAM_IDS['3']); pushView('support-program'); }
      else if (choice === '4') { setDistrictMenuPage(0); setSelectedDistrict(''); pushView('support-coop-district'); }
      else if (choice === '0') backToPrevious();
      else setError(copy.invalid);
      return;
    }

    if (view === 'support-program') {
      if (choice === '0') backToPrevious();
      else setError(copy.invalid);
      return;
    }

    if (view === 'support-coop-district') {
      const page = districtMenuPage;
      const pageDistricts = PAGE_DISTRICTS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (choice === '0') { backToPrevious(); return; }
      if (choice === '5' && (page + 1) * PAGE_SIZE < PAGE_DISTRICTS.length) { setDistrictMenuPage((current) => current + 1); return; }
      const district = pageDistricts[Number(choice) - 1];
      if (!district) { setError(copy.invalid); return; }
      setSelectedDistrict(district);
      pushView('support-coop-list');
      return;
    }

    if (view === 'support-coop-list') {
      if (choice === '0') { backToPrevious(); return; }
      const cooperative = districtCooperatives[Number(choice) - 1];
      if (!cooperative) { setError(copy.invalid); return; }
      setSelectedService(cooperative.id);
      pushView('support-coop-details');
      return;
    }

    if (view === 'support-coop-details') {
      if (choice === '0') backToPrevious();
      else setError(copy.invalid);
      return;
    }

    if (view === 'crop-stat-district' || view === 'weather-district') {
      const page = districtMenuPage;
      const pageDistricts = PAGE_DISTRICTS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (choice === '0') { backToPrevious(); return; }
      if (choice === '5' && (page + 1) * PAGE_SIZE < PAGE_DISTRICTS.length) { setDistrictMenuPage((current) => current + 1); return; }
      const district = pageDistricts[Number(choice) - 1];
      if (!district) { setError(copy.invalid); return; }
      if (view === 'weather-district') {
        setSelectedWeatherDistrict(district);
        pushView('weather-result');
      } else {
        setSelectedDistrict(district);
        setCropMenuPage(0);
        pushView('crop-stat-crop');
      }
      return;
    }

    if (view === 'crop-stat-crop') {
      const pageCrops = PAGE_CROPS.slice(cropMenuPage * PAGE_SIZE, cropMenuPage * PAGE_SIZE + PAGE_SIZE);
      if (choice === '0') { backToPrevious(); return; }
      if (choice === '5' && (cropMenuPage + 1) * PAGE_SIZE < PAGE_CROPS.length) { setCropMenuPage((current) => current + 1); return; }
      const crop = pageCrops[Number(choice) - 1];
      if (!crop) { setError(copy.invalid); return; }
      setSelectedCrop(crop);
      pushView('crop-stat-measure');
      return;
    }

    if (view === 'crop-stat-measure') {
      const measures = ['production', 'harvested_area', 'yield'];
      if (choice === '0') { backToPrevious(); return; }
      const metric = measures[Number(choice) - 1];
      if (!metric) { setError(copy.invalid); return; }
      setSelectedMetric(metric);
      pushView('crop-stat-result');
      return;
    }

    if (view === 'crop-stat-result' || view === 'weather-result') {
      if (choice === '1') {
        if (view === 'weather-result') {
          setDistrictMenuPage(0);
          setSelectedWeatherDistrict('');
          setHistory((items) => [...items.slice(0, -1), 'main']);
          setView('weather-district');
        } else {
          setDistrictMenuPage(0);
          setSelectedDistrict('');
          setSelectedCrop('');
          setHistory(['language', 'main']);
          setView('crop-stat-district');
        }
        return;
      }
      if (choice === '0') { setView('main'); setHistory(['language']); return; }
      setError(copy.invalid);
      return;
    }

    if (view === 'help-menu') {
      const issueViews = { '1': 'help-pest', '2': 'help-water', '3': 'help-inputs', '4': 'help-selling' };
      if (choice === '0') { backToPrevious(); return; }
      if (issueViews[choice]) pushView(issueViews[choice]);
      else setError(copy.invalid);
      return;
    }

    if (view === 'price-result') {
      if (choice === '1') { backToPrevious(); return; }
      if (choice === '2') {
        setDistrictPage(0);
        setSelectedDistrict('');
        setSelectedCrop('');
        setHistory(['language', 'main']);
        setView('price-district');
        return;
      }
      if (choice === '0') { setView('main'); setHistory(['language']); return; }
      setError(copy.invalid);
      return;
    }

    if (['support-steps', 'help-pest', 'help-water', 'help-inputs', 'help-selling'].includes(view) && choice === '0') {
      backToPrevious();
      return;
    }

    setError(copy.invalid);
  }

  function submitReply(event) {
    event?.preventDefault();
    handleChoice(reply);
  }

  function renderUssdText() {
    if (view === 'language') return <><p className="font-semibold">{copy.chooseLanguage}</p><p className="mt-3">1. Kinyarwanda</p><p>2. English</p></>;
    if (view === 'main') return <><p className="font-semibold">{copy.mainPrompt}</p><p className="mt-3">1. {copy.marketPrice}</p><p>2. {copy.inputSupport}</p><p>3. {copy.cropInfo}</p><p>4. {copy.weatherInfo}</p><p>5. {copy.localHelp}</p><p>0. {copy.exit}</p></>;
    if (view === 'price-district') {
      const pageDistricts = districts.slice(districtPage * PAGE_SIZE, districtPage * PAGE_SIZE + PAGE_SIZE);
      return <><p className="font-semibold">{copy.chooseDistrict}</p>{pageDistricts.map((district, index) => <p key={district}>{index + 1}. {district}</p>)}{districtPage * PAGE_SIZE + PAGE_SIZE < districts.length && <p>5. {copy.next}</p>}<p>0. {copy.back}</p></>;
    }
    if (view === 'price-crop') return <><p className="font-semibold">{copy.chooseCrop} {selectedDistrict}</p>{cropOptions.map((crop, index) => <p key={crop}>{index + 1}. {copy.cropNames[crop] ?? crop}</p>)}<p>0. {copy.back}</p></>;
    if (view === 'price-result') {
      if (!selectedPrice) return <><p>{copy.noPrice}</p><p className="mt-3">0. {copy.back}</p></>;
      return <>
        <p className="font-semibold">{copy.latestMedian}</p>
        <p className="mt-1">{copy.cropNames[selectedCrop] ?? selectedCrop} · {selectedDistrict}</p>
        <p className="mt-2 text-xl font-bold">{selectedPrice.currency} {selectedPrice.price}/{selectedPrice.unit.toLowerCase()}</p>
        <p className="mt-1">{copy.reportDate}: {selectedPrice.date}</p>
        <p>{selectedPrice.marketCount} {copy.markets} · {copy.source}</p>
        <p className="mt-2 text-amber-200">{copy.historical}</p>
        {((Date.now() - Date.parse(`${selectedPrice.date}T00:00:00Z`)) / DAY_MS) > 90 && <p className="mt-1 text-amber-200">{language === 'en' ? 'Old record: verify today’s local price before deciding.' : 'Amakuru ashaje: banza ugenzure igiciro cyo ku isoko uyu munsi.'}</p>}
        <p className="mt-2 whitespace-pre-line">{copy.priceChoices}</p>
      </>;
    }
    if (view === 'support') return <><p className="font-semibold">{copy.supportPrompt}</p><p className="mt-3">1. {copy.subsidy}</p><p>2. {copy.insurance}</p><p>3. {copy.training}</p><p>4. {copy.cooperatives}</p><p className="mt-2 text-amber-200">{copy.supportVerify}</p><p>0. {copy.back}</p></>;
    if (view === 'support-program') {
      if (!selectedProgram) return <><p>{copy.noCropData}</p><p>0. {copy.back}</p></>;
      return <><p className="font-semibold">{selectedProgram.title}</p><p className="mt-2">{selectedProgram.summary}</p><p className="mt-2">{language === 'en' ? 'Who can ask:' : 'Ababishaka:'} {selectedProgram.eligibility}</p><p className="mt-2">{language === 'en' ? 'Ask:' : 'Baza:'} {selectedProgram.contactInstructions}</p><p className="mt-2 text-amber-200">{copy.supportVerify}</p><p className="mt-2">0. {copy.back}</p></>;
    }
    if (view === 'support-coop-district') return <><p className="font-semibold">{copy.chooseDistrict}</p>{statDistrictPage.map((district, index) => <p key={district}>{index + 1}. {district}</p>)}{(districtMenuPage + 1) * PAGE_SIZE < PAGE_DISTRICTS.length && <p>5. {copy.next}</p>}<p>0. {copy.back}</p></>;
    if (view === 'support-coop-list') return <><p className="font-semibold">{language === 'en' ? 'Verified cooperatives in' : 'Amakoperative yemejwe ari muri'} {selectedDistrict}</p>{districtCooperatives.length ? districtCooperatives.map((item, index) => <p key={item.id}>{index + 1}. {item.name}</p>) : <p>{copy.supportNoMatch}</p>}<p>0. {copy.back}</p></>;
    if (view === 'support-coop-details') return selectedCooperative
      ? <><p className="font-semibold">{selectedCooperative.name} · {selectedDistrict}</p><p className="mt-2">{copy.supportCrops}: {selectedCooperative.primaryCrops.join(', ')}</p><p className="mt-2">{copy.supportContact}: {selectedCooperative.contactChannel}</p><p className="mt-2">{selectedCooperative.activities.slice(0, 2).join('; ')}.</p><p className="mt-2">{language === 'en' ? 'Ask the district office to confirm current membership and services.' : 'Baza ibiro by’Akarere byemeze serivisi n’uko wakwinjira.'}</p><p className="mt-2">0. {copy.back}</p></>
      : <><p>{copy.supportNoMatch}</p><p>0. {copy.back}</p></>;
    if (view === 'support-steps') return <><p>{copy.supportSteps}</p><p className="mt-3">0. {copy.back}</p></>;
    if (view === 'crop-stat-district') return <><p className="font-semibold">{copy.cropStatsPrompt}</p>{statDistrictPage.map((district, index) => <p key={district}>{index + 1}. {district}</p>)}{(districtMenuPage + 1) * PAGE_SIZE < PAGE_DISTRICTS.length && <p>5. {copy.next}</p>}<p>0. {copy.back}</p></>;
    if (view === 'crop-stat-crop') return <><p className="font-semibold">{copy.chooseCrop} {selectedDistrict}</p>{statCropPage.map((crop, index) => <p key={crop}>{index + 1}. {cropLabel(crop)}</p>)}{(cropMenuPage + 1) * PAGE_SIZE < PAGE_CROPS.length && <p>5. {copy.next}</p>}<p>0. {copy.back}</p></>;
    if (view === 'crop-stat-measure') return <><p className="font-semibold">{copy.chooseMeasure}</p><p>1. {copy.production}</p><p>2. {copy.area}</p><p>3. {copy.yield}</p><p>0. {copy.back}</p></>;
    if (view === 'crop-stat-result') {
      if (!embedded) return <><p>{copy.loginForData}</p><p className="mt-3">0. {copy.back}</p></>;
      if (cropObservations.isLoading) return <p>{language === 'en' ? 'Checking published records…' : 'Turimo gushaka imibare yatangajwe…'}</p>;
      if (cropObservations.isError) return <><p>{copy.noCropData}</p><p className="mt-3">{copy.tryAgain}</p></>;
      if (!publishedStat) return <><p>{copy.noCropData}</p><p className="mt-3">{copy.tryAgain}</p></>;
      return <>
        <p className="font-semibold">{copy.cropNames[selectedCrop] ?? cropLabel(selectedCrop)} · {selectedDistrict}</p>
        <p className="mt-2">{selectedMetric === 'production' ? copy.production : selectedMetric === 'harvested_area' ? copy.area : copy.yield}</p>
        <p className="mt-1 text-xl font-bold">{Number(publishedStat.value).toLocaleString(language === 'rw' ? 'rw-RW' : 'en-US')} {publishedStat.unit}</p>
        <p className="mt-1">{copy.period}: {publishedStat.year} {publishedStat.season}</p>
        <p className="mt-1 text-[10px] text-zinc-400">{publishedStat.dataset_name} · {publishedStat.source_reference}</p>
        <p className="mt-2 whitespace-pre-line">{copy.tryAgain}</p>
      </>;
    }
    if (view === 'weather-district') return <><p className="font-semibold">{copy.weatherPrompt}</p>{statDistrictPage.map((district, index) => <p key={district}>{index + 1}. {district}</p>)}{(districtMenuPage + 1) * PAGE_SIZE < PAGE_DISTRICTS.length && <p>5. {copy.next}</p>}<p>0. {copy.back}</p></>;
    if (view === 'weather-result') {
      if (!embedded) return <><p>{copy.loginForData}</p><p className="mt-3">0. {copy.back}</p></>;
      if (weatherResult.isLoading) return <p>{language === 'en' ? 'Loading recent weather…' : 'Turimo gushaka amakuru y’ikirere…'}</p>;
      if (weatherResult.isError || !weatherResult.data?.summary) return <><p>{copy.noWeather}</p><p className="mt-3 whitespace-pre-line">{copy.tryAgain}</p></>;
      const summary = weatherResult.data.summary;
      const rainfallDays = summary.validDays?.PRECTOTCORR ?? 0;
      const temperatureDays = summary.validDays?.T2M ?? 0;
      return <>
        <p className="font-semibold">{selectedWeatherDistrict} · {copy.period}: {weatherPeriod.start}–{weatherPeriod.end}</p>
        <p className="mt-2">{copy.rainfall}: {summary.rainfall == null ? '—' : `${Number(summary.rainfall).toFixed(1)} mm`}</p>
        <p>{copy.meanTemperature}: {summary.temperature == null ? '—' : `${Number(summary.temperature).toFixed(1)} °C`}</p>
        <p className="mt-1 text-[10px] text-zinc-400">{rainfallDays}/{14} {copy.validDays} · {weatherResult.data.sources?.[0]?.provider ?? 'NASA POWER'} · model-estimated district values</p>
        <p className="mt-2 text-amber-200">{copy.weatherDisclaimer}</p>
        <p className="mt-2 whitespace-pre-line">{copy.tryAgain}</p>
      </>;
    }
    if (view === 'help-menu') return <><p className="font-semibold">{copy.helpText}</p><p className="mt-3">0. {copy.back}</p></>;
    if (view === 'help-pest') return <><p>{copy.helpPest}</p><p className="mt-3">0. {copy.back}</p></>;
    if (view === 'help-water') return <><p>{copy.helpWater}</p><p className="mt-3">0. {copy.back}</p></>;
    if (view === 'help-inputs') return <><p>{copy.helpInputs}</p><p className="mt-3">0. {copy.back}</p></>;
    if (view === 'help-selling') return <><p>{copy.helpSelling}</p><p className="mt-3">0. {copy.back}</p></>;
    return <><p>{copy.ended}</p><p className="mt-3">1. {copy.restart}</p></>;
  }

  function renderMenuButtons() {
    if (view === 'ended') return <button type="button" onClick={resetPhone} className="mt-3 w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white">{copy.restart}</button>;
    const options = view === 'language'
      ? [['1', copy.kinyarwanda], ['2', copy.english]]
      : view === 'main'
        ? [['1', copy.marketPrice], ['2', copy.inputSupport], ['3', copy.cropInfo], ['4', copy.weatherInfo], ['5', copy.localHelp], ['0', copy.exit]]
        : view === 'price-district'
          ? [...districts.slice(districtPage * PAGE_SIZE, districtPage * PAGE_SIZE + PAGE_SIZE).map((district, index) => [String(index + 1), district]), ...(districtPage * PAGE_SIZE + PAGE_SIZE < districts.length ? [['5', copy.next]] : []), ['0', copy.back]]
          : view === 'price-crop'
            ? [...cropOptions.map((crop, index) => [String(index + 1), copy.cropNames[crop] ?? crop]), ['0', copy.back]]
            : view === 'price-result'
              ? [['1', language === 'en' ? 'Another crop' : 'Ikindi gihingwa'], ['2', language === 'en' ? 'Another district' : 'Hitamo akandi karere'], ['0', language === 'en' ? 'Main menu' : 'Ibikubiyemo']]
              : view === 'support'
                ? [['1', copy.subsidy], ['2', copy.insurance], ['3', copy.training], ['4', copy.cooperatives], ['0', copy.back]]
                : view === 'support-program' || view === 'support-coop-details'
                  ? [['0', copy.back]]
                  : view === 'support-coop-district'
                    ? [...statDistrictPage.map((district, index) => [String(index + 1), district]), ...((districtMenuPage + 1) * PAGE_SIZE < PAGE_DISTRICTS.length ? [['5', copy.next]] : []), ['0', copy.back]]
                    : view === 'support-coop-list'
                      ? [...districtCooperatives.map((item, index) => [String(index + 1), item.name]), ['0', copy.back]]
                : view === 'crop-stat-district' || view === 'weather-district'
                  ? [...statDistrictPage.map((district, index) => [String(index + 1), district]), ...((districtMenuPage + 1) * PAGE_SIZE < PAGE_DISTRICTS.length ? [['5', copy.next]] : []), ['0', copy.back]]
                  : view === 'crop-stat-crop'
                    ? [...statCropPage.map((crop, index) => [String(index + 1), cropLabel(crop)]), ...((cropMenuPage + 1) * PAGE_SIZE < PAGE_CROPS.length ? [['5', copy.next]] : []), ['0', copy.back]]
                    : view === 'crop-stat-measure'
                      ? [['1', copy.production], ['2', copy.area], ['3', copy.yield], ['0', copy.back]]
                      : view === 'crop-stat-result' || view === 'weather-result'
                        ? [['1', language === 'en' ? 'Another district' : 'Hitamo akandi karere'], ['0', language === 'en' ? 'Main menu' : 'Ibikubiyemo']]
                        : view === 'help-menu'
                          ? [['1', language === 'en' ? 'Pest or crop problem' : 'Udukoko cyangwa indwara'], ['2', language === 'en' ? 'Weather or water' : 'Ikirere cyangwa amazi'], ['3', language === 'en' ? 'Seeds or fertilizer' : 'Imbuto cyangwa ifumbire'], ['4', language === 'en' ? 'Selling a crop' : 'Kugurisha umusaruro'], ['0', copy.back]]
                          : [['0', copy.back]];
    return (
      <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tap an option to enter its number">
        {options.map(([number, label]) => (
          <button key={`${number}-${label}`} type="button" onClick={() => handleChoice(number)} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] text-zinc-100 hover:bg-white/20">
            {number} {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <main className={`min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/70 via-background px-4 py-6 sm:px-6 sm:py-9 ${embedded ? '' : 'to-background'}`}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <a href={embedded ? "/" : "/login"} className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden /> {embedded ? 'Back to workspace' : 'Back to AgriWiser'}
          </a>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
            <Info className="h-3.5 w-3.5" aria-hidden /> USSD simulator · demo only
          </span>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-12">
          <section className="max-w-2xl pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Access without mobile internet</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Try AgriWiser on a basic phone</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Preview a short, numbered phone menu for checking prices, input support, published crop figures, recent weather history, and practical next steps for common farm problems.
            </p>

            <div className="mt-6 space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="font-semibold">{copy.howItWorks}</h2>
              <ol className="ml-5 list-decimal space-y-2 text-sm leading-6 text-muted-foreground">
                <li>{copy.howStep1}</li>
                <li>{copy.howStep2}</li>
                <li>{copy.howStep3}</li>
              </ol>
            </div>

            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/80 p-5 text-sm leading-6 text-sky-950">
              <h2 className="font-semibold">{copy.dataHeading}</h2>
              <p className="mt-1">{copy.dataCopy}</p>
              <p className="mt-3 text-xs leading-5">{copy.demoNote}</p>
              <p className="mt-2 text-xs leading-5">{copy.liveNote}</p>
            </div>

            <div className="mt-4 rounded-xl border border-border/70 bg-white/70 px-4 py-3 text-xs leading-5 text-muted-foreground">
              {copy.availableData}
            </div>

            <p className="mt-5 text-xs text-muted-foreground">
              Price snapshot: WFP Price Database via HDX · retrieved {marketSnapshot.metadata.retrievedAt} · latest observation {marketSnapshot.metadata.latestObservation} · {marketSnapshot.metadata.coverageDistrictCount} of {marketSnapshot.metadata.nationalDistrictCount} districts represented.
            </p>
          </section>

          <section className="mx-auto w-full max-w-[370px]" aria-label="Interactive AgriWiser phone simulator">
            <div className="rounded-[3.1rem] border-[3px] border-zinc-600 bg-gradient-to-br from-zinc-500 via-zinc-800 to-black p-[7px] shadow-[0_30px_80px_-25px_rgba(7,35,24,0.55)]">
              <div className="relative min-h-[700px] overflow-hidden rounded-[2.55rem] bg-black px-5 pb-5 pt-4 text-white">
                <div className="flex items-center justify-between px-2 text-[13px] font-semibold tracking-wide">
                  <span>18:15</span>
                  <span className="flex items-center gap-1.5"><Signal className="h-4 w-4" aria-label="Cell signal" /><Wifi className="h-4 w-4" aria-label="Wi-Fi" /><BatteryMedium className="h-5 w-5" aria-label="Battery" /></span>
                </div>
                <div className="absolute left-1/2 top-[14px] h-7 w-24 -translate-x-1/2 rounded-full border border-zinc-800 bg-zinc-950" aria-hidden="true" />
                <div className="mt-8 flex items-center gap-2 px-1">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500 text-xl font-bold">P</span>
                  <span className="text-xs font-semibold text-zinc-300">{phonePhase === 'dialer' ? 'Keypad' : copy.sessionTitle}</span>
                  {phonePhase === 'session' && <button type="button" onClick={resetPhone} className="ml-auto rounded-full px-2 py-1 text-[10px] text-sky-300 hover:bg-zinc-900">{copy.cancel}</button>}
                </div>

                {phonePhase === 'dialer' ? (
                  <>
                    <div className="mt-9 min-h-14 text-center">
                      <p className="text-[11px] text-zinc-500">{copy.tryCode}</p>
                      <label htmlFor="ussd-code" className="sr-only">Demo code</label>
                      <input id="ussd-code" value={code} onChange={(event) => { setCode(event.target.value.slice(0, 12)); setError(''); }} onKeyDown={(event) => { if (event.key === 'Enter') startSession(); }} placeholder="Enter demo code" className="mt-1 w-full bg-transparent text-center text-2xl tracking-wider text-white outline-none placeholder:text-zinc-700" inputMode="none" />
                      {error && <p role="alert" className="mt-1 text-[10px] text-rose-300">{error}</p>}
                    </div>
                    <div className="mx-auto mt-5 grid max-w-[238px] grid-cols-3 justify-items-center gap-x-4 gap-y-3">
                      {digits.map(([value, letters]) => <PhoneKey key={value} value={value} letters={letters} onClick={(key) => appendKey(key)} />)}
                    </div>
                    <div className="mt-5 flex h-14 items-center justify-center gap-6">
                      <button type="button" onClick={deleteKey} aria-label="Delete last character" className="grid h-10 w-10 place-items-center rounded-full text-zinc-400 hover:bg-zinc-900"><Delete className="h-5 w-5" aria-hidden /></button>
                      <button type="button" onClick={startSession} aria-label="Start simulator session; no call will be placed" className="grid h-[68px] w-[68px] place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><Phone className="h-7 w-7 fill-current" aria-hidden /></button>
                      <span className="grid h-10 w-10 place-items-center text-zinc-500"><Globe2 className="h-4 w-4" aria-hidden /></span>
                    </div>
                    <div className="mt-6 rounded-full border border-zinc-800 bg-zinc-900/90 p-2">
                      <div className="grid grid-cols-5 text-center text-[9px] text-zinc-400">
                        {['Favorites', 'Recents', 'Contacts', 'Keypad', 'Voicemail'].map((label) => <span key={label} className={`rounded-full px-0.5 py-2 ${label === 'Keypad' ? 'bg-zinc-800 font-semibold text-sky-400' : ''}`}>{label}</span>)}
                      </div>
                    </div>
                    <p className="mt-3 text-center text-[10px] text-zinc-600">{copy.noLiveCall}</p>
                  </>
                ) : (
                  <div className="mt-5 flex min-h-[600px] flex-col">
                    <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-4 shadow-inner">
                      <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-2 text-[10px] text-zinc-500">
                        <span>AgriWiser · {language === 'en' ? 'demo' : 'demo'}</span>
                        <span>{view === 'price-result' ? copy.historicalLabel : copy.serviceLabel}</span>
                      </div>
                      <div aria-live="polite" className="min-h-[230px] whitespace-pre-line text-[13px] leading-[1.55] text-zinc-100">
                        {renderUssdText()}
                        {error && <p role="alert" className="mt-3 text-amber-300">{error}</p>}
                      </div>
                      {renderMenuButtons()}
                      {view !== 'ended' && (
                        <form onSubmit={submitReply} className="mt-4 border-t border-zinc-800 pt-3">
                          <label htmlFor="ussd-reply" className="mb-1 block text-[10px] text-zinc-400">{copy.enterChoice}</label>
                          <div className="flex gap-2">
                          <input id="ussd-reply" value={reply} onChange={(event) => { setReply(event.target.value.replace(/[^0-9*]/g, '').slice(0, 2)); setError(''); }} onKeyDown={(event) => { if (event.key === 'Escape') backToPrevious(); }} inputMode="text" className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-3 text-white outline-none focus:border-sky-400" />
                            <button type="submit" className="rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-500">{copy.send}</button>
                          </div>
                          <p className="mt-1 text-[9px] text-zinc-500">{copy.backHint}</p>
                        </form>
                      )}
                    </div>
                    <div className="mx-auto mt-4 grid max-w-[220px] grid-cols-3 justify-items-center gap-2">
                      {digits.map(([value, letters]) => <PhoneKey key={value} value={value} letters={letters} onClick={(key) => appendKey(key)} disabled={view === 'ended' || (value !== '*' && !/^\d$/.test(value))} />)}
                    </div>
                    <button type="button" onClick={view === 'ended' ? resetPhone : backToPrevious} className="mx-auto mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-900">
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {view === 'ended' ? copy.backToDialer : copy.back}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
