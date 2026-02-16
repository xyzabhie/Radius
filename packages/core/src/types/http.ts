import { RadiusRequest, RadiusResponse } from "../runner/types.js";

export interface IHttpClient {
    execute(req: RadiusRequest, signal?: AbortSignal): Promise<RadiusResponse>;
}
