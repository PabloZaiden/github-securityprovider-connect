/// <reference types="express" />
import * as Express from "express";
export declare class GithubSecurityProvider implements SecurityProvider {
    private authenticateMiddleware;
    private authorizeMiddleware;
    private static defaultScope;
    private static defaultSeconds;
    constructor(authenticateUrl: string, options: GithubSecurityProviderOptions);
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
    private static getGithubClient(token);
}
export interface GithubUser {
    username: string;
    user_id: string;
    accessToken: string;
    expire: string;
}
export interface GithubSecurityProviderOptions {
    scope: string;
    secondsUntilCheckPermissionsAgain: number;
}
export interface SecurityProvider {
    getAuthorizeMiddleware(): Express.Handler;
    getAuthenticateMiddleware(): Express.Handler;
}
