export interface FixtureRef {
  readonly fixtureId: string;
  readonly version: string;
  readonly description: string;
}

export interface GoldenCase {
  readonly id: string;
  readonly domain: string;
  readonly fixtureRef: FixtureRef;
  readonly expectedOutcome: string;
}

