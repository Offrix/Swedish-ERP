export function buildTestCompanyProfile(companyId, overrides = {}) {
  return {
    companyId,
    legalName: "Swedish ERP AB",
    orgNumber: "5566778899",
    vatNumber: "SE556677889901",
    address: {
      line1: "Sveavagen 10",
      line2: null,
      postalCode: "11157",
      city: "Stockholm",
      countryCode: "SE"
    },
    settingsJson: {},
    ...overrides
  };
}
