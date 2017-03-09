/// <reference types="express" />
import * as Express from "express";
export declare class GithubSecurityProvider implements SecurityProvider {
    private authenticateMiddleware;
    private authorizeMiddleware;
    private static defaultScope;
    constructor(authenticateUrl: string, scope?: string);
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
    private static getGithubClient(token);
}
export interface GithubUser {
    username: string;
    user_id: string;
    accessToken: string;
}
export interface SecurityProvider {
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
}
