# trust-your-supplier

This repository is meant to demonstrate how the Decentralized Identity concepts can be
demonstrated in an ecosystem where a supplier collects a digital credential from an LEI 
issuer, and leverages the credential to build a relationship (and further credentials) 
from an IBM Food Trust Network founder, the Trust Your Supplier Network and the 
IBM Food Trust Network.

Play with these samples to learn how to integrate the [openssi-websdk](https://github.com/IBM-Blockchain-Identity/openssi-websdk) into your own website.

For more information on the technology enabling these samples, take a look at [our docs](https://docs.info.verify-creds.com/).


## Developing your own samples

The code used to run the samples you played with above is included, in its entirety, 
in this repository.  You can quickly build your own sample websites from the templates 
we've provided.

### Setting up

1. Visit your agent account management page and provision four new agents, `leiissuer`, 
`gleif`, `iftfounder`, and `acme`.  Make sure the box marking the new agents as issuers is checked.

2. Find your account url and record the passwords for the three agents that you created.  You can find this information
by visiting your account dashboard, clicking on each agent, clicking the `Add Device` on the `General` page for the agent,
and clicking on `Manual Entry` in the `Register Device` popup panel.

3. Make sure all of your agents are capable of issuing credentials.  You can determine this via one of two methods:
    1. Open the account dashboard, click on the agent, and check the `Agent Role` under the `General` page.
        ```
        Agent Name: leiissuer
        Agent DID: WpAsRjUvWNdJhgcpcir1TL
        Agent Role: Issuer
        ```
    2. Use curl to check the agent's `role`, making sure it is set to `TRUST_ANCHOR`.  Use this curl command to check the
    agent's role:
        ```
        curl -u <agent_name>:<agent_password> <account_url>/api/v1/info
        ```
4. If any of the agents are not issuers, use the following `curl` command to update their role:
    ```
    curl -u <account_admin_agent_name>:<account_admin_agent_password> -X PATCH \
        <account_url>/api/v1/identities/<agent_name> \
        -H 'Content-Type: application/json' \
        -d '{ "role": "TRUST_ANCHOR" }'
    ```

5. Install...
    - [the Verify Creds mobile app](https://docs.info.verify-creds.com/explore/mobile_app/).
    OR
    - [the Verify Creds browser extension](https://docs.info.verify-creds.com/explore/browser_extension/).

### Building the samples

Build all the sample apps as docker images using the following command:

```
docker-compose build
```

### Running the samples

1. Setup your `.env` file with the necessary parameters to connect.
    ```
    $ cp .env_template .env
    
    # edit your .env file
    
    $ cat .env
    ACCOUNT_URL=https://my-account.example.com
    
    LEI_ISSUER_AGENT_NAME=leiissuer
    LEI_ISSUER_AGENT_PASSWORD=****
    
    GLEIF_AGENT_NAME=gleif
    GLEIF_AGENT_PASSWORD=****
    
    ACME_AGENT_NAME=acme
    ACME_AGENT_PASSWORD=****

    IFT_FOUNDER_AGENT_NAME=IFTFounder
    IFT_FOUNDER_AGENT_PASSWORD=****

    COUCHDB_USER_NAME=admin
    COUCHDB_USER_PASSWORD=****
    ```

    The couchdb requires an admin password. Choose one and populate the field. 

2. Start the issuers.
    ```
    docker-compose up -d
    ```

3. Browse to the localhost urls for the various issuers.
    - [LEI Issuer](http://localhost:8090)
    - [GLEIF](http://localhost:8091)
    - [ACME](http://localhost:8092)
    - [IFT_FOUNDER](http://localhost:8093)
    
4. Read the setup documentation for each app.
    - [LEI Issuer](lei-issuer/README.md#development)
    - [GLEIF](gleif/README.md#development)
    - [ACME](acme/README.md#development)
    - [IFT_FOUNDER](ift-founder/README.md#development)

4. Browse to the [CouchDB UI](http://localhost:5984/_utils) to see what the apps are writing to the database.

### Troubleshooting


### Developer Tools

- [Test Holder instructions](test_holder/README.md)

### Sample App Configuration Parameters

There are several different parameters that are used to make the sample apps do what they do.  You'll probably need to add,
remove, or tweak these values in order to transform the samples into your own proof-of-concept application.  Here's a complete
list of the existing configuration parameters:

- `DB_CONNECTION_STRING`: The Couchdb service endpoint that the sample app will use to store user records.
  `http://${COUCHDB_USER_NAME}:${COUCHDB_USER_PASSWORD}@couchdb:5984` in the Docker Compose file is what allows the 
   samples to use the `couchdb` container in the Docker Compose environment.
- `DB_USERS`: The name of the Couchdb database where user records will be stored.  If the database is not present, the
  app will attempt to create it at startup. ex. `lei_issuer_db`
- `ACCOUNT_URL`: The URL that is assigned to an account on our Public Agency and associated with a single IBMid.  The
  issuer agent should be registered under this account url. ex. `https://<account_uuid>.staging-cloud-agents.us-east.containers.appdomain.cloud/`
- `AGENT_NAME`: The name of the issuer agent on the Public Agency account. ex. `leiissuer`
- `AGENT_PASSWORD`: The password associate with the issuer agent.
- `FRIENDLY_NAME`: The friendly name to attach to connection offers, credential offers, verification requests, etc. If
  not provided, the issuer's agent name will be used. ex. `Big Blue Credit Union`
- `AGENT_LOG_LEVEL`: The log level to set for the `openssi-websdk`.  Defaults to `info`.
- `AGENT_ADMIN_NAME`: The agent name for the first agent on your Public Agency account.  These agent credentials are used
  to create the issuer agent if it doesn't already exist.  Due to performance issues with creating agents, using these
  parameters is not recommended or supported.
- `AGENT_ADMIN_PASSWORD`: The password for the admin agent.
- `CARD_IMAGE_RENDERING`: The type of rendering that should be used for credentials.  Credential rendering only comes
  into play when the issuer's credential schema has `card_front` and/or `card_back` attributes.  The available options are
  described below:
  - `none`: No credential rendering is performed and the image attributes are left blank on issued credentials.  You
    should stick to this option while in development to keep log messages to a reasonable size.
  - `static`: Static images are used to fill in the `card_front` and `card_back` attributes when issuing credentials.  This
    mode is useful when you don't yet have a true credential rendering service and want to issue credentials with placeholder
    images.  If this mode is selected, there are additional configuration parameters that must be set:
    - `STATIC_CARD_FRONT_IMAGE`: A path to an image file to be used for the `card_front` attribute when issuing credentials.
      This image should be small (<= 4KB) for performance reasons.
    - `STATIC_CARD_BACK_IMAGE`: A path to an image file to be used for the `card_back` attribute when issuing credentials.
      This image should be small (<= 4KB) for performance reasons.
  - `branding_server`: Credential images will be rendered by a remote service.  The service used by the hosted samples apps
    is not currently exposed to the public, but you could study the inputs to that service from the sample code and
    build a service of your own.  If this mode is selected, you have to provide information about the service and
    credential templates that should be used:
    - `BRANDING_SERVER_ENDPOINT`: A URL to `POST` credential attributes to in order to receive rendered credential images. 
	- `BRANDING_SERVER_FRONT_TEMPLATE`: The template to reference when asking the branding service for `card_front` images.
	- `BRANDING_SERVER_BACK_TEMPLATE`: The template to reference when asking the branding service for `card_back` images.
- `MY_URL`: The public URL for the app.  Not currently required or used.
- `CONNECTION_IMAGE_PROVIDER`: The method for attaching images to connection requests.  These connection images are most
  useful when used in conjunction with the `FRIENDLY_NAME` to help users identify the source of incoming connection offers.
  The available options are:
  - `none`: No images will be attached to connection offers.  This is the mode that should be used when developing, in order
     to keep log messages to a manageable size.
  - `static`: A static image will be attached to any connection offers.  Additional required parameters for this mode include:
    - `CONNECTION_ICON_PATH`: The path to an image file.  This image should be (<= 4KB) for performance reasons.
- `SESSION_SECRET`: The secret to use when creating and managing sessions for the sample app.
- `LOGIN_PROOF_PROVIDER`: The method for building verification requests for the verifiable credential login functionality.
  The available options are:
  - `none`: Users will not be able to log in using verifiable credentials.
  - `file`: A proof request described in a file will be used to permit users to log in to their accounts.  Required parameters
    for this mode include:
    - `LOGIN_PROOF_PATH`: The path to a file describing a login proof request.  See the example files used by the samples.
- `SIGNUP_PROOF_PROVIDER`: The method for verifying credentials when a user attempts to sign up for an account.  The options
  are as follows:
  - `none`: Users will not be able to sign up for accounts.
  - `account`: Users will be able to sign up for an account using a driver's license and proof of employment.  To modify
    the signup behavior to your use case, you'll have to write a provider of your own.  This mode requires the following
    additional parameters:
    - `SIGNUP_ACCOUNT_PROOF_PATH`: The path to a JSON file describing a signup proof request.  This file should describe
      attributes from a driver's license and attributes from an employment badge.
- `SCHEMA_TEMPLATE_PATH`: The path to a JSON file describing the credential schema for the issuer.  This parameter is configured
  in the Docker image file for each sample issuer and describes the locations of the driver's license, employment badge, and
  bank account schema files.
- `- TRUSTED_CONNECTIONS`: Agents listed here do not require connections to be manually accepted. Connection requests will  automatically be accepted. If there are no trusted agents, this field should be left blank. Trusted agents should be listed in a comma separated string, one after the other with no spaces. As an example: ${lei-issuer},${ift-network}

  when `SIGNUP_PROOF_PROVIDER === 'account'`.
- `ADMIN_API_USERNAME`: The username to use to protect the admin UI/API.  If this and `ADMIN_API_PASSWORD`
  are left blank, the admin panel will not be protected by authentication.
- `ADMIN_API_PASSWORD`: The password to use to protect the admin UI/API.
