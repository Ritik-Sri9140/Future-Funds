import bn from './bn';
import en from './en';
import gu from './gu';
import hi from './hi';
import kn from './kn';
import ml from './ml';
import mr from './mr';
import or from './or';
import pa from './pa';
import ta from './ta';
import te from './te';

type Pack = {
  en: string;
  hi: string;
  te: string;
  ta: string;
  bn: string;
  mr: string;
  kn: string;
  ml: string;
  gu: string;
  or: string;
  pa: string;
};

export const MESSAGES: Record<string, Pack> = Object.fromEntries(
  (Object.keys(en) as (keyof typeof en)[]).map((key) => [
    key,
    {
      en: en[key],
      hi: hi[key],
      te: te[key],
      ta: ta[key],
      bn: bn[key],
      mr: mr[key],
      kn: kn[key],
      ml: ml[key],
      gu: gu[key],
      or: or[key],
      pa: pa[key],
    },
  ]),
);
