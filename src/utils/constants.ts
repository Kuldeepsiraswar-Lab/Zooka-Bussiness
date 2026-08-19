import { StateCodeMap } from '../types';

export const INDIAN_STATES: StateCodeMap[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const COMMON_HSN_CODES = [
  { code: '8471', description: 'Automatic data processing machines & computers', defaultGst: 18 },
  { code: '8517', description: 'Smartphones, telecom & networking equipment', defaultGst: 18 },
  { code: '8528', description: 'Monitors, projectors and TV display equipment', defaultGst: 18 },
  { code: '9983', description: 'IT software development, consulting & design services', defaultGst: 18 },
  { code: '9982', description: 'Legal, accounting, auditing and bookkeeping services', defaultGst: 18 },
  { code: '9954', description: 'Construction and civil engineering services', defaultGst: 18 },
  { code: '4820', description: 'Registers, account books, notebooks, paper stationery', defaultGst: 12 },
  { code: '3004', description: 'Medicaments and pharmaceutical formulations', defaultGst: 12 },
  { code: '6109', description: 'T-shirts, singlets and other vests, knitted/crocheted', defaultGst: 5 },
  { code: '6203', description: 'Men suits, jackets, blazers, trousers', defaultGst: 12 },
  { code: '0402', description: 'Milk and cream, concentrated or sweetened', defaultGst: 5 },
  { code: '1905', description: 'Bread, pastry, cakes, biscuits and bakery wares', defaultGst: 18 },
  { code: '8708', description: 'Parts and accessories of motor vehicles', defaultGst: 28 },
  { code: '9403', description: 'Office and household furniture and parts', defaultGst: 18 },
  { code: '9963', description: 'Restaurant, catering and food serving services', defaultGst: 5 },
  { code: '9972', description: 'Real estate services (renting/leasing commercial)', defaultGst: 18 },
];

export const STANDARD_UNITS = [
  'PCS', 'NOS', 'BOX', 'KGS', 'GMS', 'LTR', 'ML', 'MTR', 'SQF', 'SQM', 'SET', 'PAC', 'BAG', 'DOZ', 'HRS', 'DAY', 'MON'
];

export const STATE_CODE_LIST = INDIAN_STATES;

export const HSN_MASTER_LIST = COMMON_HSN_CODES.map(item => ({
  code: item.code,
  description: item.description,
  gstRate: item.defaultGst
}));


