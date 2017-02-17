# github-securityprovider-connect

Security provider to integrate Github OAuth2 with your connect application, veritying that a user belongs to an organization

## How to use

- Create a new instance of the class `GithubSecurityProvider` passing the url where the user must be redirected when the app must authenticate him
- Call `getAuthorizeMiddleware` to get connect middleware to apply to requests that require a used logged in
- Call `getAuthenticateMiddleware` to get connect middleware to apply to requests that handle the authentication process (the OAuth2 callback)

## Requirements

This component required the following environment variables:
    - GITHUB_CLIENT_ID: The github app client id
    - GITHUB_CLIENT_SECRET: The github app client secret
    - GITHUB_CALLBACK_URL: The github app OAuth2 callback url
    - GITHUB_ORGANIZATION: The github organization used to perform authorization