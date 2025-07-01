declare module '@paypal/paypal-server-sdk' {
  export class PayPalHttpClient {
    constructor(environment: any);
    execute(request: any): Promise<any>;
  }

  export class SandboxEnvironment {
    constructor(clientId: string, clientSecret: string);
  }

  export namespace orders {
    class OrdersCreateRequest {
      constructor();
      prefer(prefer: string): void;
      requestBody(body: object): void;
    }

    class OrdersCaptureRequest {
      constructor(orderId: string);
      requestBody(body: object): void;
    }

    export { OrdersCreateRequest, OrdersCaptureRequest };
  }
}
