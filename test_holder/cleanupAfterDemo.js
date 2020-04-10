/**
 © Copyright IBM Corp. 2019, 2019

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

const Agent = require('openssi-websdk').Agent;
const fetch = require('node-fetch');

// Logging setup
const Logger = require('./libs/logger.js').Logger;
Logger.setLogLevel('info');
const logger = Logger.makeLogger(Logger.logPrefix(__filename));


const jsonPrint = function (o) {
	return JSON.stringify(o, 2, ' ');
};

/*
const required = [ 'AGENT_NAME', 'AGENT_PASSWORD', 'ACCOUNT_URL' ];
for (const index in required) {
	if (!process.env[required[index]]) {
		throw new Error(`Missing environment parameter ${required[index]}`);
	}
}
*/

// Pull required configuration parameters from environment variables

const ev = {
	ACCOUNT_URL: process.env.ACCOUNT_URL,
	LEI_ISSUER_AGENT_NAME: process.env.LEI_ISSUER_AGENT_NAME,
	LEI_ISSUER_AGENT_PASSWORD: process.env.LEI_ISSUER_AGENT_PASSWORD,
	GLEIF_AGENT_NAME: process.env.GLEIF_AGENT_NAME,
	GLEIF_AGENT_PASSWORD: process.env.GLEIF_AGENT_PASSWORD,
	ACME_AGENT_NAME: process.env.ACME_AGENT_NAME,
    ACME_AGENT_PASSWORD: process.env.ACME_AGENT_PASSWORD,
    TYS_AGENT_NAME: process.env.TYS_AGENT_NAME,
    TYS_AGENT_PASSWORD: process.env.TYS_AGENT_PASSWORD,
    IFT_FOUNDER_AGENT_NAME: process.env.IFT_FOUNDER_AGENT_NAME,
    IFT_FOUNDER_AGENT_PASSWORD: process.env.IFT_FOUNDER_AGENT_PASSWORD,
    IFT_NETWORK_AGENT_NAME: process.env.IFT_NETWORK_AGENT_NAME,
	IFT_NETWORK_AGENT_PASSWORD: process.env.IFT_NETWORK_AGENT_PASSWORD,
	CA_TEST_CLEANUP_ACCOUNTS: process.env.CA_TEST_CLEANUP_ACCOUNTS
};

/*
const ev = {
	ACCOUNT_URL: "https://07ca644c06e0d5d2f41f659bf96567ae13e069ba4f134bf76722fd4a.staging-cloud-agents.us-east.containers.appdomain.cloud",
	LEI_ISSUER_AGENT_NAME: "bloomberg",
	LEI_ISSUER_AGENT_PASSWORD: "Cg5vSaGZlDmYNCxzYfa9",
	GLEIF_AGENT_NAME: "gleif1",
	GLEIF_AGENT_PASSWORD: "RDjsh2hT1MB9PPv0aF3X",
	ACME_AGENT_NAME: "acme",
    ACME_AGENT_PASSWORD: "w0Ss2qun8ZP6mM5IbXbh",
    TYS_AGENT_NAME: "tys",
    TYS_AGENT_PASSWORD: "14vRU4XKcIJuVqeWcwF3",
    IFT_FOUNDER_AGENT_NAME: "WatsonOrganicFarms",
    IFT_FOUNDER_AGENT_PASSWORD: "WH6DUcbyYKkXsdpoJWbv",
    IFT_NETWORK_AGENT_NAME: "iftnetwork",
	IFT_NETWORK_AGENT_PASSWORD: "956CEQiS1ehQO8jw4ULz",
	CA_TEST_CLEANUP_ACCOUNTS: "acme@example.com"
};
*/

for (const key in ev) {
	if (key.toLowerCase().indexOf('password') >= 0) continue;
	console.debug(`${key}: ${ev[key]}`);
}


(async () => {
	try {
		console.log("starting cleanup");
		const accountsToCleanup = ev.CA_TEST_CLEANUP_ACCOUNTS;
		let accountsToCleanupArray = null;
		if (accountsToCleanup && accountsToCleanup.length > 0) {
			accountsToCleanupArray = accountsToCleanup.split(',');
		}
		if (!accountsToCleanupArray || !Array.isArray(accountsToCleanupArray) || accountsToCleanupArray.length === 0) {
			// no accounts to delete
			console.info('Not deleting any accounts, no accounts specified')
		} else {
			// accounts to delete, make sure we have the information we need
			if ((!ev.IFT_FOUNDER_URL || ev.IFT_FOUNDER_URL.length === 0) ||
				(!ev.TYS_URL || ev.TYS_URL.length === 0) ||
				(!ev.IFT_NETWORK_URL || ev.IFT_NETWORK_URL.length === 0)) {

				console.error('cannot delete accounts if ift-founder, tys and/or ift-network urls not specified');
			}
		}

		// initialize agents
		const loggingLevel = ev.AGENT_LOG_LEVEL ? ev.AGENT_LOG_LEVEL : 'info';
		console.info(`ev: ${JSON.stringify(ev)}`);
		const gleifAgent = new Agent(ev.ACCOUNT_URL, ev.GLEIF_AGENT_NAME, ev.GLEIF_AGENT_PASSWORD, "GLEIF");
		gleifAgent.setLoggingLevel(loggingLevel);
		const leiIssuerAgent = new Agent(ev.ACCOUNT_URL, ev.LEI_ISSUER_AGENT_NAME, ev.LEI_ISSUER_AGENT_PASSWORD, "LEIIssuer");
		leiIssuerAgent.setLoggingLevel(loggingLevel);
		const iftFounderAgent = new Agent(ev.ACCOUNT_URL, ev.IFT_FOUNDER_AGENT_NAME, ev.IFT_FOUNDER_AGENT_PASSWORD, "IFTFounder");
		iftFounderAgent.setLoggingLevel(loggingLevel);
		const tysAgent = new Agent(ev.ACCOUNT_URL, ev.TYS_AGENT_NAME, ev.TYS_AGENT_PASSWORD, "TYS");
		tysAgent.setLoggingLevel(loggingLevel);
		const iftNetworkAgent = new Agent(ev.ACCOUNT_URL, ev.IFT_NETWORK_AGENT_NAME, ev.IFT_NETWORK_AGENT_PASSWORD, "IFTNetwork");
		iftNetworkAgent.setLoggingLevel(loggingLevel);
		const acmeAgent = new Agent(ev.ACCOUNT_URL, ev.ACME_AGENT_NAME, ev.ACME_AGENT_PASSWORD, "Acme");
		acmeAgent.setLoggingLevel(loggingLevel);

		await deleteAllCredentials(gleifAgent);
		await deleteConnections(gleifAgent, leiIssuerAgent);
		await deleteAllCredentials(leiIssuerAgent);
		await deleteConnections(leiIssuerAgent, acmeAgent);
		await deleteAllCredentials(iftFounderAgent);
		await deleteConnections(iftFounderAgent, acmeAgent);
		await deleteAllCredentials(tysAgent);
		await deleteConnections(tysAgent, acmeAgent);
		await deleteAllCredentials(iftNetworkAgent);
		await deleteConnections(iftNetworkAgent, acmeAgent);
		await deleteAllCredentials(acmeAgent);
		await deleteAllConnections(acmeAgent);
		await deleteAccounts(accountsToCleanupArray);

		console.log('cleaned up successfully');
	} catch (error){
		console.error(`Encountered error: ${error}`);
		console.error(`stack: ${error.stack}`);
	}

	async function deleteConnections(fromAgent, toAgent) {
		if (!fromAgent || !toAgent) {
			throw new Error("need to provide fromAgent and toAgent to deleteConnections");
		}
		const toName = (await toAgent.getIdentity()).name;
		const fromName = (await fromAgent.getIdentity()).name;
		console.info(`*************** DELETING ${toName} CONNECTIONS from ${fromName} ***************`);
		let search = {};
		search['remote.name'] = toName;
		const connections = await fromAgent.getConnections(search);
		console.info(`*************** ${connections ? connections.length : 0} CONNECTIONS TO DELETE ***************`);
		for (const index in connections) {
			const conn = connections[index];
			console.debug(`***************DELETING CONNECTION ${conn.id} to ${conn.remote ? conn.remote.name : 'nobody'}***************`);
			try {
				await fromAgent.deleteConnection(conn.id);
			} catch (error) {
				console.error(`Error when deleting connection ${conn.id}: ${error}`);
			}
		}
	}

	async function deleteAllConnections(fromAgent) {
		if (!fromAgent) {
			throw new Error("need to provide fromAgent to deleteAllConnections");
		}
		const fromName = (await fromAgent.getIdentity()).name;
		console.info(`*************** DELETING ALL CONNECTIONS from ${fromName} ***************`);
		const connections = await fromAgent.getConnections();
		console.info(`*************** ${connections ? connections.length : 0} Connections TO DELETE ***************`);
		for (const index in connections) {
			const conn = connections[index];
			console.debug(`*************** DELETING CONNECTION ${conn.id} ***************`);
			try {
				await fromAgent.deleteConnection(conn.id);
			} catch (error) {
				console.error(`Error when deleting connection ${conn.id}: ${error}`);
			}
		}
	}

	async function deleteAllCredentials(fromAgent) {
		if (!fromAgent) {
			throw new Error("need to provide fromAgent to deleteAllCredentials");
		}
		const fromName = (await fromAgent.getIdentity()).name;
		console.info(`*************** DELETING ALL CREDENTIALS from ${fromName} ***************`);
		const credentials = await fromAgent.getCredentials();
		console.info(`*************** ${credentials ? credentials.length : 0} CREDENTIALS TO DELETE ***************`);
		for (const index in credentials) {
			const cred = credentials[index];
			console.debug(`*************** DELETING CREDENTIAL ${cred.id} ***************`);
			try {
				await fromAgent.deleteCredential(cred.id);
			} catch (error) {
				console.error(`Error when deleting credential ${cred.id}: ${error}`);
			}
		}
	}

	// delete the given array of accounts (specified by username) from ift-founder
	//  tys and ift-network
	async function deleteAccounts(usernameArray) {
		if (!usernameArray) {
			return;
		}

		console.info(`*************** ${usernameArray.length} USERNAMES TO DELETE ***************`);
		for (let i=0; i < usernameArray.length; i++) {
			const username = usernameArray[i];
			try {
				console.info(`*************** DELETING USERNAME: ${username} ***************`);
				await fetch(`http://tys:3000/api/users/${username}`, {'method': 'DELETE'});
				await fetch(`http://ift-founder:3000/api/users/${username}`, {'method': 'DELETE'});
				await fetch(`http://ift-network:3000/api/users/${username}`, {'method': 'DELETE'});
			} catch (error) {
				console.error(`Error while deleting username: ${username}, exiting deleteAccounts`);
				throw error;
			}
		}
	}
/*
	if (ev.CREDENTIALS_CLEANUP) {
		logger.info('***************DELETING CREDENTIALS***************');
		const credentials = await gleifAgent.getCredentials();
		logger.info(`***************${credentials.length} CREDENTIALS TO DELETE***************`);
		for (const index in credentials) {
			logger.debug(`***************DELETING CREDENTIAL ${credentials[index].id}***************`);
			try {
				await agent.deleteCredential(credentials[index].id);
			} catch (error) {
				logger.error(`Error when deleting connection ${credentials[index].id}: ${error}`);
			}
		}
	}

	if (ev.VERIFICATIONS_CLEANUP) {
		logger.info('***************DELETING VERIFICATION***************');
		const verifications = await agent.getVerifications();
		logger.info(`***************${verifications.length} VERIFICATIONS TO DELETE***************`);
		for (const index in verifications) {
			logger.debug(`***************DELETING VERIFICATION ${verifications[index].id}***************`);
			try {
				await agent.deleteVerification(verifications[index].id);
			} catch (error) {
				logger.error(`Error when deleting verification ${verifications[index].id}: ${error}`);
			}
		}
	}

	async function loop () {
		console.log('######################################### loop()...');
		console.log(`My Agency ID is: ${ev.AGENT_NAME}`);

		const offers = await agent.getConnections({
			state: 'inbound_offer'
		});
		logger.info('Connection Offers: '+offers.length);
		if (offers.length > 0) {
			logger.debug('offers='+jsonPrint(offers));
			const offer = offers[0];
			try {
				logger.info(`Accepting connection offer ${offer.id} from  ${offer.remote.name}`);
				const r = await agent.acceptConnection(offer.id);
				logger.info('Accepted connection offer '+r.id+' from '+r.remote.name);
			} catch (error) {
				logger.error(`Couldn't accept connection offer ${offer.id}.  You may want to delete it. Error: ${error}`);
				if (ev.DELETE_BAD_CONNECTION_OFFERS) {
					logger.info(`Deleting bad connection offer ${offer.id}`);
					await agent.deleteConnection(offer.id);
				}
			}
		}

		const credentials = await agent.getCredentials({
			state: 'inbound_offer'
		});
		logger.info('Credential Offers: '+credentials.length);
		if (credentials.length > 0) {
			//logger.info("credentials="+jsonPrint(credentials));
			const credential = credentials[0];
			try {
				logger.info(`Accepting credential offer ${credential.id}...`);
				const r = await agent.updateCredential(credential.id, 'accepted');
				logger.info(`Accepted credential offer ${credential.id}`);
				logger.debug('Accepted credential offer '+jsonPrint(r));
			} catch (error) {
				logger.error(`Couldn't accept credential offer ${credential.id}. You may want to delete it. Error: ${error}`);
				if (ev.DELETE_BAD_CREDENTIAL_OFFERS) {
					logger.info(`Deleting bad credential offer ${credential.id}`);
					await agent.deleteCredential(credential.id);
				}
			}
		}

		// Check for new verification requests
		const verificationRequests = await agent.getVerifications({
			state: {$nin: [ 'passed', 'proof_shared' ]}
		});
		//logger.info("Requests="+jsonPrint(verificationRequests));
		logger.info(`Verification Requests: ${verificationRequests.length}`);
		for (const c in verificationRequests) {
			const request = verificationRequests[c];

			logger.debug(`Verification request: ${jsonPrint(request)}`);
			logger.info(`Verification request status: ${request.state}`);
			if (request.state === 'inbound_proof_request') {
				try {
					//logger.info(" --- proof icon="+request.properties.icon);
					await agent.updateVerification(request.id, 'proof_generated');
					logger.info('Accepted proof request');
				}
				catch (e) {
					logger.error('Error accepting proof request: '+e.message);

					logger.info('***************DELETING PROOF REQUEST proof request***************');
					await agent.deleteVerification(request.id);
					logger.info('Deleted');
					//process.exit(1);
				}
			}
			else if (request.state === 'proof_generated') {
				logger.info('Displaying proof values to be returned:');
				const attributes = request['proof_view']['attributes'];
				for (const i in attributes) {
					let verifiedAttribute = ' ';
					if (attributes[i]['cred_def_id']) {
						verifiedAttribute = '*';
					}
					logger.info('  ' + verifiedAttribute + attributes[i].name + '=' +attributes[i].value);
				}
				logger.info('(*Value from credential)');
				try {
					const r = await agent.updateVerification(request.id, 'proof_shared');
					//logger.info("Send proof response "+jsonPrint(r));
					if (r.state === 'passed') {
						logger.info('Proof response successfully sent');
					}
					else {
						logger.error('Error sending proof response');
						process.exit(1);
					}
				}
				catch (e) {
					logger.error('Error sending proof response: '+e.message);
					process.exit(1);
				}
			}
		}
		setTimeout(loop, ev.LOOP_INTERVAL ? ev.LOOP_INTERVAL : 5000);
	}
	loop();
*/

})();


