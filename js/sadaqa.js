// صدقة جارية لشهداء آل الحولي — card, duas for the deceased, counters, gifted dhikr, names sky.
// Cloud data is shared totals only (stats/sadaqa: duas, dhikr · stats/shuhada: n0…n29 per name); nothing personal.
import * as store from './store.js';
import { init as fbInit, isConfigured } from './challenge.js';
import { shareCard } from './extras.js';
import { MARTYRS } from './martyrs.js';

let ctx = null; // { I, esc, toast, vibrate, render }
export function initSadaqa(c) { ctx = c; }

const AR = '٠١٢٣٤٥٦٧٨٩';
const arNum = n => Number(n || 0).toLocaleString('en-US').replace(/\d/g, d => AR[d]).replace(/,/g, '٬');

/* ---------- duas for the deceased: Quran, Sunnah, and general duas ----------
   m / f / p = masculine / feminine / plural; N = the person's name; q = Quran text (Uthmani) */
const DUAS = [
  { src: 'رواه مسلم',
    m: 'اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ، وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِ، وَأَدْخِلْهُ الْجَنَّةَ، وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ النَّارِ',
    f: 'اللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا، وَعَافِهَا وَاعْفُ عَنْهَا، وَأَكْرِمْ نُزُلَهَا، وَوَسِّعْ مُدْخَلَهَا، وَاغْسِلْهَا بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهَا مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهَا دَارًا خَيْرًا مِنْ دَارِهَا، وَأَهْلًا خَيْرًا مِنْ أَهْلِهَا، وَأَدْخِلْهَا الْجَنَّةَ، وَأَعِذْهَا مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ النَّارِ',
    p: 'اللَّهُمَّ اغْفِرْ لَهُمْ وَارْحَمْهُمْ، وَعَافِهِمْ وَاعْفُ عَنْهُمْ، وَأَكْرِمْ نُزُلَهُمْ، وَوَسِّعْ مُدْخَلَهُمْ، وَاغْسِلْهُمْ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِمْ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الْأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُمْ دَارًا خَيْرًا مِنْ دَارِهِمْ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِمْ، وَأَدْخِلْهُمُ الْجَنَّةَ، وَأَعِذْهُمْ مِنْ عَذَابِ الْقَبْرِ وَمِنْ عَذَابِ النَّارِ' },
  { src: 'رواه أبو داود وابن ماجه',
    m: 'اللَّهُمَّ إِنَّ N فِي ذِمَّتِكَ وَحَبْلِ جِوَارِكَ، فَقِهِ مِنْ فِتْنَةِ الْقَبْرِ وَعَذَابِ النَّارِ، وَأَنْتَ أَهْلُ الْوَفَاءِ وَالْحَقِّ، فَاغْفِرْ لَهُ وَارْحَمْهُ، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ',
    f: 'اللَّهُمَّ إِنَّ N فِي ذِمَّتِكَ وَحَبْلِ جِوَارِكَ، فَقِهَا مِنْ فِتْنَةِ الْقَبْرِ وَعَذَابِ النَّارِ، وَأَنْتَ أَهْلُ الْوَفَاءِ وَالْحَقِّ، فَاغْفِرْ لَهَا وَارْحَمْهَا، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ',
    p: 'اللَّهُمَّ إِنَّهُمْ فِي ذِمَّتِكَ وَحَبْلِ جِوَارِكَ، فَقِهِمْ مِنْ فِتْنَةِ الْقَبْرِ وَعَذَابِ النَّارِ، وَأَنْتَ أَهْلُ الْوَفَاءِ وَالْحَقِّ، فَاغْفِرْ لَهُمْ وَارْحَمْهُمْ، إِنَّكَ أَنْتَ الْغَفُورُ الرَّحِيمُ' },
  { src: 'رواه مسلم — دعاء النبي ﷺ لأبي سلمة',
    m: 'اللَّهُمَّ اغْفِرْ لِـN، وَارْفَعْ دَرَجَتَهُ فِي الْمَهْدِيِّينَ، وَاخْلُفْهُ فِي عَقِبِهِ فِي الْغَابِرِينَ، وَاغْفِرْ لَنَا وَلَهُ يَا رَبَّ الْعَالَمِينَ، وَافْسَحْ لَهُ فِي قَبْرِهِ، وَنَوِّرْ لَهُ فِيهِ',
    f: 'اللَّهُمَّ اغْفِرْ لِـN، وَارْفَعْ دَرَجَتَهَا فِي الْمَهْدِيِّينَ، وَاخْلُفْهَا فِي عَقِبِهَا فِي الْغَابِرِينَ، وَاغْفِرْ لَنَا وَلَهَا يَا رَبَّ الْعَالَمِينَ، وَافْسَحْ لَهَا فِي قَبْرِهَا، وَنَوِّرْ لَهَا فِيهِ',
    p: 'اللَّهُمَّ اغْفِرْ لَهُمْ، وَارْفَعْ دَرَجَتَهُمْ فِي الْمَهْدِيِّينَ، وَاخْلُفْهُمْ فِي عَقِبِهِمْ فِي الْغَابِرِينَ، وَاغْفِرْ لَنَا وَلَهُمْ يَا رَبَّ الْعَالَمِينَ، وَافْسَحْ لَهُمْ فِي قُبُورِهِمْ، وَنَوِّرْ لَهُمْ فِيهَا' },
  { src: 'رواه الحاكم وصحّحه الألباني',
    m: 'اللَّهُمَّ عَبْدُكَ وَابْنُ أَمَتِكَ احْتَاجَ إِلَى رَحْمَتِكَ، وَأَنْتَ غَنِيٌّ عَنْ عَذَابِهِ، إِنْ كَانَ مُحْسِنًا فَزِدْ فِي حَسَنَاتِهِ، وَإِنْ كَانَ مُسِيئًا فَتَجَاوَزْ عَنْهُ',
    f: 'اللَّهُمَّ أَمَتُكَ وَبِنْتُ أَمَتِكَ احْتَاجَتْ إِلَى رَحْمَتِكَ، وَأَنْتَ غَنِيٌّ عَنْ عَذَابِهَا، إِنْ كَانَتْ مُحْسِنَةً فَزِدْ فِي حَسَنَاتِهَا، وَإِنْ كَانَتْ مُسِيئَةً فَتَجَاوَزْ عَنْهَا',
    p: 'اللَّهُمَّ عِبَادُكَ وَأَبْنَاءُ إِمَائِكَ احْتَاجُوا إِلَى رَحْمَتِكَ، وَأَنْتَ غَنِيٌّ عَنْ عَذَابِهِمْ، إِنْ كَانُوا مُحْسِنِينَ فَزِدْ فِي حَسَنَاتِهِمْ، وَإِنْ كَانُوا مُسِيئِينَ فَتَجَاوَزْ عَنْهُمْ' },
  { src: 'من حديث أبي داود: «استغفروا لأخيكم وسلوا له التثبيت»',
    m: 'اللَّهُمَّ اغْفِرْ لَهُ، اللَّهُمَّ ثَبِّتْهُ عِنْدَ السُّؤَالِ، وَثَبِّتْهُ بِالْقَوْلِ الثَّابِتِ',
    f: 'اللَّهُمَّ اغْفِرْ لَهَا، اللَّهُمَّ ثَبِّتْهَا عِنْدَ السُّؤَالِ، وَثَبِّتْهَا بِالْقَوْلِ الثَّابِتِ',
    p: 'اللَّهُمَّ اغْفِرْ لَهُمْ، اللَّهُمَّ ثَبِّتْهُمْ عِنْدَ السُّؤَالِ، وَثَبِّتْهُمْ بِالْقَوْلِ الثَّابِتِ' },
  { src: 'رواه أبو داود والترمذي',
    all: 'اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا، وَشَاهِدِنَا وَغَائِبِنَا، وَصَغِيرِنَا وَكَبِيرِنَا، وَذَكَرِنَا وَأُنْثَانَا، اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الْإِسْلَامِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الْإِيمَانِ، اللَّهُمَّ لَا تَحْرِمْنَا أَجْرَهُ، وَلَا تُضِلَّنَا بَعْدَهُ' },
  { src: 'رواه مسلم — عند زيارة القبور',
    all: 'السَّلَامُ عَلَيْكُمْ أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ، وَإِنَّا إِنْ شَاءَ اللَّهُ بِكُمْ لَلَاحِقُونَ، نَسْأَلُ اللَّهَ لَنَا وَلَكُمُ الْعَافِيَةَ' },
  { src: 'سورة الحشر — الآية ١٠', q: true, all: "رَبَّنَا ٱغۡفِرۡ لَنَا وَلِإِخۡوَٰنِنَا ٱلَّذِينَ سَبَقُونَا بِٱلۡإِيمَٰنِ وَلَا تَجۡعَلۡ فِي قُلُوبِنَا غِلّٗا لِّلَّذِينَ ءَامَنُواْ رَبَّنَآ إِنَّكَ رَءُوفٞ رَّحِيمٌ" },
  { src: 'سورة نوح — الآية ٢٨', q: true, all: "رَّبِّ ٱغۡفِرۡ لِي وَلِوَٰلِدَيَّ وَلِمَن دَخَلَ بَيۡتِيَ مُؤۡمِنٗا وَلِلۡمُؤۡمِنِينَ وَٱلۡمُؤۡمِنَٰتِ" },
  { src: 'سورة إبراهيم — الآية ٤١', q: true, all: "رَبَّنَا ٱغۡفِرۡ لِي وَلِوَٰلِدَيَّ وَلِلۡمُؤۡمِنِينَ يَوۡمَ يَقُومُ ٱلۡحِسَابُ" },
  { src: 'سورة غافر — دعاء الملائكة للمؤمنين (٧–٩)', q: true, all: "رَبَّنَا وَسِعۡتَ كُلَّ شَيۡءٖ رَّحۡمَةٗ وَعِلۡمٗا فَٱغۡفِرۡ لِلَّذِينَ تَابُواْ وَٱتَّبَعُواْ سَبِيلَكَ وَقِهِمۡ عَذَابَ ٱلۡجَحِيمِ ۝ رَبَّنَا وَأَدۡخِلۡهُمۡ جَنَّـٰتِ عَدۡنٍ ٱلَّتِي وَعَدتَّهُمۡ وَمَن صَلَحَ مِنۡ ءَابَآئِهِمۡ وَأَزۡوَٰجِهِمۡ وَذُرِّيَّـٰتِهِمۡۚ إِنَّكَ أَنتَ ٱلۡعَزِيزُ ٱلۡحَكِيمُ ۝ وَقِهِمُ ٱلسَّيِّـَٔاتِۚ وَمَن تَقِ ٱلسَّيِّـَٔاتِ يَوۡمَئِذٖ فَقَدۡ رَحِمۡتَهُۥۚ وَذَٰلِكَ هُوَ ٱلۡفَوۡزُ ٱلۡعَظِيمُ" },
  { src: 'دعاء',
    m: 'اللَّهُمَّ تَقَبَّلْهُ فِي الشُّهَدَاءِ، وَارْفَعْ دَرَجَتَهُ فِي عِلِّيِّينَ، وَاجْعَلْهُ مَعَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ مِنَ النَّبِيِّينَ وَالصِّدِّيقِينَ وَالشُّهَدَاءِ وَالصَّالِحِينَ، وَحَسُنَ أُولَئِكَ رَفِيقًا',
    f: 'اللَّهُمَّ تَقَبَّلْهَا فِي الشُّهَدَاءِ، وَارْفَعْ دَرَجَتَهَا فِي عِلِّيِّينَ، وَاجْعَلْهَا مَعَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ مِنَ النَّبِيِّينَ وَالصِّدِّيقِينَ وَالشُّهَدَاءِ وَالصَّالِحِينَ، وَحَسُنَ أُولَئِكَ رَفِيقًا',
    p: 'اللَّهُمَّ تَقَبَّلْهُمْ فِي الشُّهَدَاءِ، وَارْفَعْ دَرَجَتَهُمْ فِي عِلِّيِّينَ، وَاجْعَلْهُمْ مَعَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ مِنَ النَّبِيِّينَ وَالصِّدِّيقِينَ وَالشُّهَدَاءِ وَالصَّالِحِينَ، وَحَسُنَ أُولَئِكَ رَفِيقًا' },
  { src: 'دعاء',
    m: 'اللَّهُمَّ اجْعَلْ قَبْرَهُ رَوْضَةً مِنْ رِيَاضِ الْجَنَّةِ، وَافْسَحْ لَهُ فِيهِ مَدَّ بَصَرِهِ، وَآنِسْ وَحْشَتَهُ، وَارْحَمْ غُرْبَتَهُ، وَأَنْزِلْ عَلَيْهِ مِنْ رَحْمَتِكَ وَنُورِكَ',
    f: 'اللَّهُمَّ اجْعَلْ قَبْرَهَا رَوْضَةً مِنْ رِيَاضِ الْجَنَّةِ، وَافْسَحْ لَهَا فِيهِ مَدَّ بَصَرِهَا، وَآنِسْ وَحْشَتَهَا، وَارْحَمْ غُرْبَتَهَا، وَأَنْزِلْ عَلَيْهَا مِنْ رَحْمَتِكَ وَنُورِكَ',
    p: 'اللَّهُمَّ اجْعَلْ قُبُورَهُمْ رِيَاضًا مِنْ رِيَاضِ الْجَنَّةِ، وَافْسَحْ لَهُمْ فِيهَا مَدَّ أَبْصَارِهِمْ، وَآنِسْ وَحْشَتَهُمْ، وَارْحَمْ غُرْبَتَهُمْ، وَأَنْزِلْ عَلَيْهِمْ مِنْ رَحْمَتِكَ وَنُورِكَ' },
  { src: 'دعاء',
    m: 'اللَّهُمَّ ارْزُقْهُ الْفِرْدَوْسَ الْأَعْلَى بِغَيْرِ حِسَابٍ وَلَا سَابِقَةِ عَذَابٍ، وَاجْعَلْهُ مِنَ ﴿الَّذِينَ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ﴾، وَاجْمَعْنَا بِهِ فِي جَنَّاتِ النَّعِيمِ',
    f: 'اللَّهُمَّ ارْزُقْهَا الْفِرْدَوْسَ الْأَعْلَى بِغَيْرِ حِسَابٍ وَلَا سَابِقَةِ عَذَابٍ، وَاجْعَلْهَا مِنَ ﴿الَّذِينَ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ﴾، وَاجْمَعْنَا بِهَا فِي جَنَّاتِ النَّعِيمِ',
    p: 'اللَّهُمَّ ارْزُقْهُمُ الْفِرْدَوْسَ الْأَعْلَى بِغَيْرِ حِسَابٍ وَلَا سَابِقَةِ عَذَابٍ، وَاجْعَلْهُمْ مِنَ ﴿الَّذِينَ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ﴾، وَاجْمَعْنَا بِهِمْ فِي جَنَّاتِ النَّعِيمِ' },
  { src: 'دعاء',
    m: 'اللَّهُمَّ اجْعَلْ مَا قَدَّمَهُ نُورًا لَهُ فِي قَبْرِهِ، وَشَفِيعًا لَهُ يَوْمَ الْقِيَامَةِ، وَاكْتُبْ لَهُ أَجْرَ كُلِّ مَنْ ذَكَرَكَ أَوْ دَعَا لَهُ بِهَذَا التَّطْبِيقِ',
    f: 'اللَّهُمَّ اجْعَلْ مَا قَدَّمَتْهُ نُورًا لَهَا فِي قَبْرِهَا، وَشَفِيعًا لَهَا يَوْمَ الْقِيَامَةِ، وَاكْتُبْ لَهَا أَجْرَ كُلِّ مَنْ ذَكَرَكَ أَوْ دَعَا لَهَا بِهَذَا التَّطْبِيقِ',
    p: 'اللَّهُمَّ اجْعَلْ مَا قَدَّمُوهُ نُورًا لَهُمْ فِي قُبُورِهِمْ، وَشَفِيعًا لَهُمْ يَوْمَ الْقِيَامَةِ، وَاكْتُبْ لَهُمْ أَجْرَ كُلِّ مَنْ ذَكَرَكَ أَوْ دَعَا لَهُمْ بِهَذَا التَّطْبِيقِ' },
  { src: 'رواه مسلم — لمن فقد عزيزاً',
    all: 'إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ، اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي، وَأَخْلِفْ لِي خَيْرًا مِنْهَا' },
  { src: 'دعاء لأهلهم',
    all: 'اللَّهُمَّ اجْبُرْ كَسْرَ أَهْلِهِمْ، وَارْبِطْ عَلَى قُلُوبِهِمْ، وَأَنْزِلْ عَلَيْهِمُ الصَّبْرَ وَالسَّكِينَةَ، وَاجْعَلْ مُصَابَهُمْ رِفْعَةً لَهُمْ فِي الدُّنْيَا وَالْآخِرَةِ' }
];

const form = (d, who) => {
  if (d.all) return d.all;
  if (!who) return d.p;
  return (who.f ? d.f : d.m).replace('N', who.name);
};
const pr = who => !who ? { lh: 'لهم', rh: 'رحمهم الله' } : who.f ? { lh: 'لها', rh: 'رحمها الله' } : { lh: 'له', rh: 'رحمه الله' };

function S() {
  const s = store.get();
  s.sadaqa = s.sadaqa || { gift: false, pending: 0, myDuas: 0, myGift: 0, cache: null };
  s.sadaqa.last = s.sadaqa.last || {};
  return s.sadaqa;
}
const dayNo = () => Math.floor((Date.now() + 2 * 3600000) / 86400000);
export const nameOfDay = () => {
  if (!MARTYRS.length) return null;
  const d = new Date(dayNo() * 86400000), md = String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  return MARTYRS.find(m => m.day === md) || MARTYRS[dayNo() % MARTYRS.length];
};
const idxOf = who => MARTYRS.indexOf(who);
const initial = n => n.trim().charAt(0);

/* ---------- cloud ---------- */
const refA = (fs, db) => fs.doc(db, 'stats', 'sadaqa');
const refP = (fs, db) => fs.doc(db, 'stats', 'shuhada');
export async function refresh() {
  if (!isConfigured() || !navigator.onLine) return S().cache;
  try {
    const { db, fs } = await fbInit();
    const [a, p] = await Promise.all([fs.getDoc(refA(fs, db)), fs.getDoc(refP(fs, db)).catch(() => null)]);
    const d = a.exists() ? a.data() : {};
    const pp = p && p.exists() ? p.data() : (S().cache && S().cache.per) || {};
    S().cache = { duas: d.duas || 0, dhikr: d.dhikr || 0, per: pp, t: Date.now() };
    store.save();
  } catch (e) { /* rules not published yet, or offline: keep cached numbers */ }
  return S().cache;
}
async function bump(fields, which = 'a') {
  if (!isConfigured()) return false;
  try {
    const { db, fs } = await fbInit();
    const data = {};
    for (const k in fields) data[k] = fs.increment(fields[k]);
    await fs.setDoc(which === 'p' ? refP(fs, db) : refA(fs, db), data, { merge: true });
    return true;
  } catch (e) { return false; }
}

/** Count dhikr gifted to them (only when the user chose to dedicate it). */
export function add(n = 1) {
  const q = S();
  return; // gifting option removed from the home screen
  if (!q.gift) return;
  q.pending = (q.pending || 0) + n;
  q.myGift = (q.myGift || 0) + n;
  store.save();
}
let flushing = false;
export async function flush() {
  const q = S();
  if (flushing || !q.pending || !navigator.onLine) return;
  flushing = true;
  const n = Math.min(q.pending, 2000);
  if (await bump({ dhikr: n })) {
    q.pending -= n; store.save();
    if (q.cache) q.cache.dhikr += n;
  }
  flushing = false;
}
setInterval(flush, 8000);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

/* ---------- home card ---------- */
export function cardHTML() {
  const I = ctx.I, q = S(), c = q.cache;
  const friday = new Date().getDay() === 5;
  const who = nameOfDay(), P = pr(who);
  const cnt = who && c && c.per ? c.per[`n${idxOf(who)}`] || 0 : null;
  return `
  <section class="sq-card" data-el="sadaqa">
    <svg class="sq-bg" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#D9B26A" stroke-width="3"><rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/></g></svg>
    ${friday ? `<a class="sq-fri" href="#/read?s=18">${I.book}<span>اليوم جمعة: اقرأ سورة الكهف وأهدِ ثوابها لهم</span></a>` : ''}
    <div class="sq-stats" data-el="sq-stats">${statsHTML(c)}</div>
  </section>`;
}
function statsHTML(c) {
  if (!c) return `<span>🤲 ادعُ لهم وكن أول الداعين</span>`;
  return `<span><b>${arNum(c.duas)}</b> دعوة لهم</span><span><b>${arNum(c.dhikr)}</b> ذكر أُهدي لهم</span>`;
}
export function bindCard(root) {
  const el = root.querySelector('[data-el="sadaqa"]'); if (!el) return;
  const stats = el.querySelector('[data-el="sq-stats"]');
  const paint = c => {
    if (!c || !document.body.contains(el)) return;
    stats.innerHTML = statsHTML(c);
    const who = nameOfDay(), tn = el.querySelector('[data-el="sq-today-n"]');
    if (who && tn && c.per) tn.textContent = `دعا ${pr(who).lh} ${arNum(c.per[`n${idxOf(who)}`] || 0)} شخص · ${pr(who).rh}`;
  };
  refresh().then(paint);
  el.querySelector('[data-el="sq-gift"]')?.addEventListener('change', e => {
    S().gift = e.target.checked; store.save();
    ctx.toast(e.target.checked ? 'تقبّل الله منك 🤍 ذكرك من هلأ مُهدى لهم' : 'تمام، وقّفنا الإهداء');
  });
  el.querySelectorAll('[data-act="sq-today"]').forEach(b => b.addEventListener('click', () => openDua(nameOfDay(), paint)));
  el.querySelector('[data-act="sq-all"]')?.addEventListener('click', () => openDua(null, paint));
  el.querySelector('[data-act="sq-share"]')?.addEventListener('click', () => share(null));
}

/* ---------- dua sheet: swipe through the duas ---------- */
export function openDua(who, onCount) {
  const I = ctx.I, P = pr(who), c = S().cache;
  const i0 = who ? idxOf(who) : -1;
  const cnt = who ? (c && c.per ? c.per[`n${i0}`] || 0 : null) : (c ? c.duas : null);
  const N = DUAS.length;
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  const slides = DUAS.map((d, k) => `<div class="sq-slide" data-k="${k}" ${k ? 'hidden' : ''}><p class="sq-dua ${d.q ? 'q' : ''}">${d.q ? `﴿${d.all}﴾` : form(d, who)}</p><p class="sq-src">${d.src}</p></div>`).join('');
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-label="ادعُ ${P.lh}"><span class="sheet-handle"></span>
    <div class="row between" style="gap:12px">
      ${who ? `<span class="sq-av">${initial(who.name)}</span>` : ''}
      <span style="flex:1"><b style="font-size:17px">${who ? ctx.esc(who.name) : 'ادعُ لشهداء آل الحولي'}</b><small class="muted" style="display:block;font-size:12px">${P.rh}${cnt != null ? ` · دعا ${P.lh} ${arNum(cnt)} شخص` : ''}</small></span>
      <button class="icon-btn" data-act="x" aria-label="إغلاق">${I.close}</button></div>
    <div class="sq-slides" data-el="slides">${slides}</div>
    <div class="sq-nav"><button class="icon-btn" data-act="prev" aria-label="الدعاء السابق">${I.back}</button>
      <span class="sq-pos" data-el="pos">١ / ${arNum(N)}</span>
      <button class="icon-btn" data-act="next" aria-label="الدعاء التالي">${I.left}</button></div>
    <div class="row" style="gap:8px">
      <button class="btn big" style="flex:1" data-act="done">دعوتُ ${P.lh} 🤍</button>
      <button class="btn ghost big" data-act="share" aria-label="شارك" style="width:58px;padding:0">${I.share}</button>
    </div>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 300); };
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  wrap.querySelector('[data-act="x"]').addEventListener('click', close);
  let k = 0;
  const show = n => {
    k = (n + N) % N;
    wrap.querySelectorAll('.sq-slide').forEach(s => { s.hidden = +s.dataset.k !== k; });
    wrap.querySelector('[data-el="pos"]').textContent = `${arNum(k + 1)} / ${arNum(N)}`;
  };
  // RTL: the "next" arrow points left
  wrap.querySelector('[data-act="next"]').addEventListener('click', () => show(k + 1));
  wrap.querySelector('[data-act="prev"]').addEventListener('click', () => show(k - 1));
  const sl = wrap.querySelector('[data-el="slides"]'); let x0 = null;
  sl.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  sl.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(dx > 0 ? k + 1 : k - 1); x0 = null; });
  wrap.querySelector('[data-act="share"]').addEventListener('click', () => share(who));
  wrap.querySelector('[data-act="done"]').addEventListener('click', async () => {
    const q = S();
    q.myDuas = (q.myDuas || 0) + 1;
    const key = who ? `n${i0}` : 'all';
    const fresh = Date.now() - (q.last[key] || 0) > 30 * 60000;   // one count per half hour per device and name
    if (fresh) q.last[key] = Date.now();
    store.save();
    ctx.vibrate([20, 40, 20]);
    ctx.toast('تقبّل الله دعاءك 🤍');
    close();
    if (!fresh) return;
    const okA = await bump({ duas: 1 });
    const okP = who ? await bump({ [`n${i0}`]: 1 }, 'p') : false;
    const cc = q.cache || (q.cache = { duas: 0, dhikr: 0, per: {}, t: Date.now() });
    cc.per = cc.per || {};
    if (okA) cc.duas += 1;
    if (okP) cc.per[`n${i0}`] = (cc.per[`n${i0}`] || 0) + 1;
    store.save();
    onCount && onCount(cc);
  });
}

function share(who) {
  if (who) {
    const P = pr(who);
    return shareCard({ kind: 'sadaqa', title: 'ادعُ ' + P.lh, big: who.name, text: who.f ? 'اللهم اغفر لها وارحمها، وتقبّلها في الشهداء، وارفع درجتها في عليين' : 'اللهم اغفر له وارحمه، وتقبّله في الشهداء، وارفع درجته في عليين', sub: 'صدقة جارية · تطبيق أذكاري adhkari-app.github.io' });
  }
  shareCard({ kind: 'sadaqa', title: 'صدقة جارية', big: 'شهداء آل الحولي', text: 'اللهم اغفر لهم وارحمهم، وتقبّلهم في الشهداء، وارفع درجتهم في عليين', sub: 'ادعُ لهم · تطبيق أذكاري adhkari-app.github.io' });
}

/* ---------- names page: a night sky, one star per name ---------- */
const POS = [[50, 6], [22, 17], [78, 19], [36, 31], [66, 35], [20, 48], [80, 50], [50, 60], [28, 73], [72, 76], [50, 88], [14, 86], [86, 86]];
export const Shuhada = {
  html() {
    const I = ctx.I, c = S().cache, per = (c && c.per) || {};
    const counts = MARTYRS.map((_, i) => per[`n${i}`] || 0), max = Math.max(1, ...counts);
    const used = POS.slice(0, Math.min(MARTYRS.length, POS.length)), maxY = Math.max(...used.map(p => p[1]), 1);
    const stars = MARTYRS.map((m, i) => {
      const [x, y0] = POS[i % POS.length], y = 4 + (y0 - 4) * (82 / (maxY - 4 || 1));
      const size = 16 + Math.round(16 * (counts[i] / max));
      return `<button class="sq-star" style="left:${x}%;top:${y}%;--d:${((i * 0.37) % 2).toFixed(2)}s" data-i="${i}" aria-label="ادعُ ${m.f ? 'لها' : 'له'}: ${ctx.esc(m.name)}">
        <i style="width:${size}px;height:${size}px"></i><span>${ctx.esc(m.name)}</span><small data-el="cnt${i}">${c ? `${arNum(counts[i])} دعوة` : ''}</small></button>`;
    }).join('');
    const dots = Array.from({ length: 70 }, (_, i) => `<span class="sq-dot" style="left:${((i * 37.7) % 100).toFixed(1)}%;top:${((i * 61.3) % 100).toFixed(1)}%;--d:${(i % 7) * 0.5}s"></span>`).join('');
    return `
    <div class="sq-sky">
      <header class="title-bar" style="background:transparent"><a class="icon-btn" href="#/home" aria-label="رجوع" style="color:#F2D9A0;border-color:rgba(217,178,106,.4)">${I.back}</a><h1 style="color:#F2D9A0">شهداء آل الحولي</h1></header>
      <p class="sq-skyv">﴿وَلَا تَحْسَبَنَّ الَّذِينَ قُتِلُوا فِي سَبِيلِ اللَّهِ أَمْوَاتًا ۚ بَلْ أَحْيَاءٌ عِندَ رَبِّهِمْ يُرْزَقُونَ﴾<small>آل عمران — ١٦٩</small></p>
      <div class="sq-field">${dots}${stars}</div>
      <p class="sq-skyhint">اكبس على أي اسم لتدعو له · كل ما يدعولهم الناس أكثر، بيضوي النجم أكثر</p>
      <div class="sq-skyacts"><button class="sq-b" data-act="sq-all">ادعُ لهم جميعاً</button><button class="sq-g sq-ic" data-act="sq-share" aria-label="شارك">${I.share}</button></div>
      <p class="sq-skyhint" style="opacity:.6">نحسبهم شهداء ولا نزكّي على الله أحداً</p>
    </div>`;
  },
  mount(root) {
    document.body.classList.add('sky-mode');
    root.querySelectorAll('.sq-star').forEach(b => b.addEventListener('click', () => openDua(MARTYRS[+b.dataset.i], () => ctx.render())));
    root.querySelector('[data-act="sq-all"]').addEventListener('click', () => openDua(null, null));
    root.querySelector('[data-act="sq-share"]').addEventListener('click', () => share(null));
    refresh().then(c => {
      if (!c || !c.per || !document.body.contains(root)) return;
      MARTYRS.forEach((_, i) => { const e = root.querySelector(`[data-el="cnt${i}"]`); if (e) e.textContent = `${arNum(c.per[`n${i}`] || 0)} دعوة`; });
    });
  },
  unmount() { document.body.classList.remove('sky-mode'); }
};
