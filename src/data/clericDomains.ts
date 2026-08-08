import raw from "./clericDomains.json";

export interface DomainSpell {
  level: number;
  spell: string;
}

export interface DomainDef {
  name: string;
  specialAbility: string;
  bonusSpells: DomainSpell[];
  notes: string[];
}

// Sourced from nwnravenloft.fandom.com/wiki/Cleric_Domains and each domain's own wiki page.
export const CLERIC_DOMAINS: DomainDef[] = raw as DomainDef[];

export const DOMAIN_NAMES: string[] = CLERIC_DOMAINS.map((d) => d.name).sort();

const DOMAINS_BY_NAME = new Map(CLERIC_DOMAINS.map((d) => [d.name, d]));

export function getDomain(name: string): DomainDef | undefined {
  return DOMAINS_BY_NAME.get(name);
}

export const MAX_DOMAINS = 2;
