declare module 'sila-sdk' {
  interface SilaConfig {
    handle: string;
    first_name: string;
    last_name: string;
    entity_name: string;
    address_alias: string;
    street_address_1: string;
    city: string;
    state: string;
    postal_code: string;
    phone: string;
    email: string;
    identity_alias: string;
    identity_value: string;
    date_of_birth: string;
    type: string;
  }

  interface SilaResponse {
    success: boolean;
    message?: string;
    status?: string;
    transaction_id?: string;
    sila_balance?: number;
    address?: string;
  }

  interface LinkAccountConfig {
    account_name: string;
    public_token?: string;
    account_number?: string;
    routing_number?: string;
    account_type?: string;
  }

  interface KYCConfig {
    kyc_level: string;
  }

  interface TransferConfig {
    descriptor?: string;
  }

  interface IssueConfig {
    account_name: string;
    descriptor?: string;
  }

  interface TransactionQuery {
    transaction_id: string;
  }

  class Sila {
    constructor(appHandle: string, privateKey: string, environment: string);
    
    register(config: SilaConfig): Promise<SilaResponse>;
    requestKYC(userHandle: string, config: KYCConfig): Promise<SilaResponse>;
    generateWallet(): Promise<{ address: string }>;
    linkAccount(userHandle: string, config: LinkAccountConfig): Promise<SilaResponse>;
    issueSila(amount: number, userHandle: string, config: IssueConfig): Promise<SilaResponse>;
    transferSila(amount: number, fromHandle: string, toHandle: string, config: TransferConfig): Promise<SilaResponse>;
    getSilaBalance(address: string): Promise<SilaResponse>;
    getTransactions(query: TransactionQuery): Promise<SilaResponse>;
  }

  export = Sila;
}
