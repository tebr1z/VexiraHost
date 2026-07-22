export interface DomainSearchResult {
  domain: string;
  tld: string;
  available: boolean;
  price: number;
  currency: string;
  premium: boolean;
}

export interface RegistrarRegistrationResult {
  registrarRef: string;
  expiresAt: Date;
  nameservers: string[];
}

export interface RegistrarTransferResult {
  registrarRef: string;
  status: "pending" | "completed";
}

export interface RegistrarDnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

export interface RegistrarProvider {
  search(query: string): Promise<DomainSearchResult[]>;
  register(domain: string): Promise<RegistrarRegistrationResult>;
  initiateTransfer(domain: string, authCode: string): Promise<RegistrarTransferResult>;
}
