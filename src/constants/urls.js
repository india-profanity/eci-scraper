export const EICURLs = {
  baseURL: 'https://gateway-voters.eci.gov.in/api/v1',
  state: {
    endpoint: '/common/states',
    method: 'GET',
  },
  districts: {
    endpoint: '/common/districts/:stateCd',
    method: 'GET',
  },
  acs: {
    endpoint: '/common/acs/:districtCd',
    method: 'GET',
  },
  get_part_list: {
    endpoint: '/printing-publish/get-part-list',
    method: 'POST',
    body: {
      stateCd: '',
      districtCd: '',
      acNumber: '',
    },
  },
  get_ac_languages: {
    endpoint: '/printing-publish/get-ac-languages',
    method: 'POST',
    body: {
      stateCd: '',
      districtCd: '',
      acNumber: '',
    },
  },
};
