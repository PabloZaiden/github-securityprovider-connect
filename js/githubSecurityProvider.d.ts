/// <reference types="express" />
import * as Express from "express";
export default class GithubSecurityProvider implements SecurityProvider {
    private authenticateMiddleware;
    private authorizeMiddleware;
    constructor(authenticateUrl: string);
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
}
export interface SecurityProvider {
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
}
