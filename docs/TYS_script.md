# Quick outline for running the demo
## Initial Setup
### Create Agents
In your IBM Verify Credentials account you will need to create agents for the webapps that this demo contains.  Copy the `.env_template` to a file called `.env` and fill in the environment variables appropriately for your environment (including account URL and agent URLs, names and passwords).  You will need to create a new agent in your account for each AGENT entry in the `.env` file.  Each of these agents will need to be an issuer.

### Start Webapps

 1. Run `docker-compose down` to stop any webapp and database containers still running from previous runs.
 2. Run `docker-compose build` to build any changes that have been made to the demo
 3. Run `docker-compose up -d` to bring up all of the webapp and database containers

### Initialize credential schemas and credential definitions

Each issuer needs to have their credential schemas and credential definitions published to this demo's ledger.

* GLEIF
* Bloomberg
* Watson Organic Farms
* TYS
* IFT Network

Bring up the webapps for each in a browser tab:

[http://localhost:8091](http://localhost:8091): GLEIF

[http://localhost:8090](http://localhost:8090): Bloomberg/LEI-Issuer

[http://localhost:8093](http://localhost:8093): Watson Organic Farms/IFT-Founder

[http://localhost:8094](http://localhost:8094): TYS

[http://localhost:8095](http://localhost:8095): IFT Network

To publish the credential schemas and definitions, do:

1. Select the `Admin` button on each webapp's sign in page.
2. Select `Create Schema`.  Use default values.
3. Once the schema has been created, click on `Publish Cred Def`

## Run the demo
Follow the documentation for the Trust Your Supplier samples.

### Logout+login from IBM Verify Credentials account
In an effort to make sure that your IBM ID won't expire during the middle of a demo run, you should logout from your IBM Verify Credentials account and then log back into it using the browser that you will use during your demo.

### Ensure credential manager setup

#### Chrome extension
If you are using the IBM Verify Credentials Chrome browser extension as your credential manager during the demo, make sure that it is enabled.  It will be blue when enabled and while you are logged into IBM Verify Credentials with your IBM ID.

#### Mobile app
If you are using the IBM Verify Credentials mobile app as your credential manager during the demo, make sure that you have added agent associations for both the Bloomberg (lei-issuer) and Acme agents.

### Quick Start Webapps
 1. Run `docker-compose down` to stop any webapp and database containers still running from previous runs.
 2. Run `docker-compose build` to build any changes that have been made to the demo
 3. Run `docker-compose up -d` to bring up all of the webapp and database containers

After about 30s open each of the following web apps in a browser new tab:

[http://localhost:8091](http://localhost:8091): GLEIF

[http://localhost:8090](http://localhost:8090): Bloomberg/LEI-Issuer

[http://localhost:8093](http://localhost:8093): Watson Organic Farms/IFT-Founder

[http://localhost:8094](http://localhost:8094): TYS

[http://localhost:8095](http://localhost:8095): IFT Network

[https://search.gleif.org/#/record/549300VKX8CWI7ZGME90](https://search.gleif.org/#/record/549300VKX8CWI7ZGME90) The GLEIF search results for Acme Brick's LEI

[https://www.gmeiutility.org/](https://www.gmeiutility.org/) Link for Acme Brick's real LEI Issuer

If the webapps had already been opened from a previous demo run, you should refresh the webpage that the webapp is displaying on to ensure that the chrome-extension will be recognized by the webapp.


### Create Webapp Accounts

Click on the Admin button and make sure that a Bloomberg/LEI-Issuer account has been created in GLEIF.

Click on the Admin button and make sure that an Acme account has been created in Bloomberg/LEI-Issuer

### Cleanup After Run

We have created a cleanup script, `cleanupAfterDemo.sh`.  It can be used in two different ways:

`./cleanupAfterDemo.sh` will cleanup the connections and credentials as documented below.

`./cleanupAfterDemo.sh <account userid>` will cleanup the connections and credentials as documented below.  In addition, it will cleanup the comma-separated list of accounts from the running webapps.

The most common usage will likely be `./cleanupAfterDemo.sh acme@example.com`.

If you'd like to cleanup manually, follow the following guidelines:

#### Cleanup Webapp Accounts

Click on the Admin button for each of the following webapps and delete the Acme accounts in:

* Watson Farms/IFT-Founder
* TYS
* IFT Network

#### Cleanup Agents from previous runs

Use the IBM Verify Credentials web UI to cleanup the following resources.

GLEIF:

* cleanup all credentials
* cleanup all connections to Bloomberg

Bloomberg/LEI-Issuer:

* cleanup all credentials
* cleanup all connections to Acme and GLEIF
* leave all connections to Watson Farms (IFT-Founder) and TYS

Watson Farms/IFT-Founder:

* cleanup all credentials
* cleanup all connections to Acme
* leave all connections to Bloomberg/LEI-Issuer

TYS:

* cleanup all credentials
* cleanup all connections to Acme
* leave all connections to Bloomberg/LEI-Issuer

IFT Network:

* cleanup all credentials
* cleanup all connections to Acme
* leave all connections to Bloomberg/LEI-Issuer, TYS and Watson Farms (IFT-Founder)

Acme:

* cleanup all credentials
* cleanup all connections

## Hints

Watson Organic Farms, TYS and IFT Network all issue a credential as part of the account signup process.  To avoid having multiple copies of the same credential, remember to not click on the "obtain your digital credential" buttons on those webapp's account pages and to cleanup after every demo run.


# Script

## Introduction
I am here today to demo the Trust Your Supplier samples available on GitHub.  The goal of the demo is to show how a company can become a globally registered legal entity and leverage this registration to become a supplier to another company and onboard onto an IBM Blockchain network.

Their are six components to this demo.  There are five mocked up web apps representing GLEIF, Bloomberg, Watson Organic Farms, the Trust Your Supplier network and the IBM Food Trust network.  And there is a ficticious company that we'll call Acme that will interact with these webapps.

GLEIF is a foundation whose mission is to standardize the global registration of legal entities such as companies and corporations.  It accreditates and oversees a collection of companies that do the actual vetting and verification of information of the entities seeking to be globally registered.  The product of the verification is a Legal Entity Identifier that will be granted to this entity.

Bloomberg is a company that is one of the inspectors for GLEIF.

Watson Organic Farms represents a universally recognized corporation with a wide variety of suppliers.

Trust Your Supplier (or TYS) is an IBM Blockchain network of buyers who are looking to share information about their suppliers with other members of the network in an effort to reduce costs and engage the most reliable suppliers possible.

IBM Food Trust Network (or IFT Network) is an IBM Blockchain network of farmers, distrubitors and grocery stores and everything in between.  It has the goal to track, in a verifiable way, the journey of crops in the field to their eventual landing place on store shelves; gathering data such has how long the crop was on a truck and at what temperature, how long was it in the distribution center, and more.

Acme represents a supplier that is looking to work with Watson Organic Farms and be accepted into the TYS and IFT networks.

During this demo we'll be using the IBM Verify Credentials Chrome Extension to interact with the cloud agents behind this demo.  The Chrome Extension can be associated with one agent at a time.  In the first exchange we'll show in the demo, we'll be acting as Bloomberg, so we'll select that agent now.

## Outline

### GLEIF

Make sure the Bloomberg agent is currently selected in the Chrome Extension.

Mention:

* Bloomberg is trying to become an accredited LEI Issuer under GLEIF
* During the vetting process, Bloomberg:
	* established an account with GLEIF
	* provided GLEIF the address of the Bloomberg agent endpoint
* The demo makes the assumption that Bloomberg has already been vetted and accredited by GLEIF and is now logging into the GLEIF webapp to acquire their digital accreditation as a verifiable credential
* The process of acquiring the credential involves:
	* GLEIF agent extends a connection offer to the Bloomberg agent if it doesn't already exist.  The chrome extension will notify the Bloomberg user that the agent it is monitoring has received this offer and will ask the user whether to accept or reject the connection.
	* GLEIF agent extends a credential offer to the Bloomberg agent.  The chrome extension will notify the Bloomberg user that the agent it is monitoring has received this offer and will ask the user whether to accept or reject the credential offer.
	* Upon acceptance, the Bloomberg agent will communicate with the GLEIF agent to receive the credential and store it in the Bloomberg wallet.
* GLEIF has implemented passwordless auth.  Which means that GLEIF will accept their own credential as proof of account ownership in place of userid and password.  When the user selects `Sign in with Verifiable Credential`, the following process will unfold:
	* GLEIF agent extends a connection offer to the Bloomberg agent if it doesn't already exist.  The chrome extension will notify the Bloomberg user that the agent it is monitoring has received this offer and will ask the user whether to accept or reject the connection.
	* GLEIF agent extends a proof request to the Bloomberg agent.  The proof request may look for any number of attestations from any number of credentials.  In this case, the GLEIF proof request is looking for a single specific identifier from the digital accredidation verifiable credential that GLEIF issues.
	* After receiving the proof request, the Bloomberg agent will search the Bloomberg wallet for credentials that contain the types of attestations that the proof request is looking for.  The chrome extension will notify the Bloomberg user that the agent it is monitoring has received this request and will ask the user whether to send back to GLEIF the attestations that it has found to satisfy the request.
	* Upon receiving the response from the Bloomberg agent, the GLEIF agent will verify the data in the response by cryptographically and mathematically determining that the values came from the credentials that they purport to be from as well as whether the credentials have been revoked or are still in good standing.  If verification is a success, the web application will receive the values from the proof response for whatever further examination is required by the GLEIF business processes.

### Bloomberg

Make sure the Acme agent is currently selected in the Chrome Extension.  Assumes that the GLEIF interaction has already happened.

Mention:

* Acme is coming to Bloomberg, an LEI Issuer, to acquire an LEI for itself.
* Similar to the GLEIF flow, the demo assumes that Acme has already applied to Bloomberg to acquire their LEI and has provided all necessary documentation, specified a username and password for their new Bloomberg account and provided the address of their agent endpoint.
* Similar to the GLEIF flow, when Acme goes to Bloomberg to acquire their digital LEI, a connection will need to be established between the Bloomberg agent and the Acme agent if one doesn't already exist.  After that step, Bloomberg will send a credential offer to Acme containing their LEI information that Acme must accept to store the credential in their wallet.
* Similar to GLEIF, the credential issued by Bloomberg can also be consumed by Bloomberg during passwordless authentication.


### Watson Organic Farms

Make sure the Acme agent is currently selected in the Chrome Extension.  Assumes GLEIF and Bloomberg interactions have already taken place and that Acme has a digitl LEI in their wallet.

Mention:

* Acme is coming to the Watson Organic Farms (WOF) site as part of the process to become a supplier to WOF.
* With Watson Organic Farms (WOF), the first interaction is that Acme needs to create an account.
	* Note that Acme must supply userid, password and Agent endpoint address (URL) now wherease in the GLEIF and Bloomberg interactions this took place during the vetting process.
* As part of signup, Acme will be asked to provide the LEI attribute from a digital LEI credential.
* After establishing that a connection is in place, WOF will send Acme a proof request asking this attribute.  Upon receiving the proof request, Acme's agent will look inside the wallet for credentials and their attributes that satisfy the proof.  The Acme user will be prompted whether to send this information to WOF (since the data could be sensative).
* When WOF agent receives the response to the proof, it will verify, mathematically and cryptographically, whether the supplied data satisfies the proof request and that the data contained in the response hasn't been altered en route.
* After verification happens, the WOF webapp will be able to examine the values provided in the response to make further decisions.
* After verification happens, WOF will issue a supplier credential to Acme that can be used for passwordless authentication upon login.

### TYS

Make sure the Acme agent is currently selected in the Chrome Extension.  Assumes GLEIF and Bloomberg interactions have already taken place and that Acme has a digital LEI in their wallet.

Mention:

* Acme is coming to TYS to become a member of the Trust Your Supplier blockchain network.  Such a membership could be leveraged by Acme to  establish new relationships with buyers who are part of the network.
* Similar to WOF, TYS will ask for a digital LEI in order to create the account for Acme on the TYS system.
* The credential that is eventually issued to Acme (along with its account) contains a `trust_value` attribute with a numberical value.  A verifier could potentially write a proof request where it asks for a TYS credential where the `trust_value` is above a certain value and make decisions based on this and other factors.  For example, perhaps the verifier has a different vetting process if the value is below a certain threshold.

### IFT Network

Make sure the Acme agent is currently selected in the Chrome Extension.  Assumes GLEIF, Bloomberg and WOF interactions have already taken place (and possibly TYS also) and that Acme has a WOF supplier credential as well as a digital LEI and/or TYS credential in the Acme wallet.

Mention:

* Acme is coming to IFT Network to participate and share its data to the network for the work it does with Watson Organic Farms.
* During signup Acme is asked to profide a supplier credential from an IFT Founder (WOF in this case) and values from either a TYS credential or a digital LEI.
* Notice that unlike other proof requests, IFT Network is asking for data from two different credentials.  This shows the flexibility of a proof request.  It can request any number of attributes from any number of credentials filtered by credential schemas by name, version and issuer.
* After receiving the response from Acme, the IFT Network can make decisions based on the data that Acme supplied.


**Don't forget to cleanup after your demo run in anticipation of your next demo!**