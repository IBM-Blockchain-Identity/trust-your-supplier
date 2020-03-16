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

const path = require('path');
const fs = require('fs');
const uuidv4 = require('uuid/v4');
const async = require('async');
const request = require('request');

const Logger = require('./logger.js').Logger;
const logger = Logger.makeLogger(Logger.logPrefix(__filename));

/**
 * Provides functions that allow a developer to delegate responsibility for building proof requests and checking proof
 * responses for validity.
 *
 * @interface ProofHelper
 */

/**
 * Gets a proof schema object that can be used to create a proof schema on the agent
 * @async
 * @function
 * @name ProofHelper#getProofSchema
 * @param {object} [opts] Parameters that are relevant to the construction of the proof request.
 * @returns {Promise<object>} A promise that resolves with a proof schema.
 */

/**
 * Checks a proof response.  This might mean check the proof against whatever information is in the opts parameter.
 * @async
 * @function
 * @name ProofHelper#checkProof
 * @param {object} proof The proof response to check.
 * @param {object} [opts] Data to check the proof response against.
 * @returns {Promise<object>} A promise that resolves with the accepted proof or rejects if the proof was not accepted.
 */

/**
 * Allows developers to delegate responsibility for managing proof schemas, proof verification, and user record creation.
 *
 * @interface SignupHelper
 * @extends ProofHelper
 */

/**
 * @async
 * @function SignupHelper#proofToUserRecord
 * @param {object} verification An accepted verification.
 * @returns {Promise<object>} A promise that resolves with personal data for a user record extracted from the proof data.
 */

/**
 * Generates static proof requests for verifiable credential based logins.
 * @class
 * @implements {ProofHelper}
 */
class LoginHelper {

	/**
	 * Creates a LoginHelper that will serve proof requests based on the given file
	 * @param {string} proof_schema_file The path to a proof schema file
	 */
	constructor (proof_schema_file) {
		if (!proof_schema_file || typeof proof_schema_file !== 'string')
			throw new TypeError('Invalid path to proof schema file');

		// Make sure the proof schema is a json file
		const ext = path.extname(proof_schema_file).toLowerCase().substring(1); // Remove the period in the extension
		if (ext !== 'json')
			throw new Error (`File ${proof_schema_file} is not a json file!`);

		// Make sure the image exists
		if (!fs.existsSync(proof_schema_file))
			throw new Error(`File ${proof_schema_file} does not exist`);

		this.proof_schema_file = proof_schema_file;
		this.proof_schema_template = null;
	}

	async getProofSchema (opts) {

		// Get the schema if we don't already have it.
		if (!this.proof_schema_template) {
			logger.info(`Loading proof schema: ${this.proof_schema_file}`);
			const file_promise = new Promise(((resolve, reject) => {
				fs.readFile(this.proof_schema_file, (error, file) => {
					if (error) return reject(error);
					resolve(file);
				});
			}));
			const proof_schema = JSON.parse(await file_promise);
			if (!proof_schema.name || !proof_schema.version) throw new Error('Invalid proof schema');
			this.proof_schema_template = proof_schema;
		}

		// Keep the login proof schemas unique.
		const ret = JSON.parse(JSON.stringify(this.proof_schema_template)); // Copy
		ret.version = ret.version + Date.now();

		// Assign any restrictions to the proof request, if some were given.
		if (ret.requested_attributes && opts && opts.restrictions) {
			for (const key in ret.requested_attributes) {
				ret.requested_attributes[key].restrictions = opts.restrictions;
			}
		}
		return ret;
	}

	async checkProof (verification, user_record) {
		if (!verification || !verification.info || !verification.info.attributes)
			throw new TypeError('No attributes found in given Verification');
		if (!user_record || !user_record.personal_info)
			throw new TypeError('Invalid user record');

		// Get the schema if we don't already have it.
		if (!this.proof_schema_template) {
			logger.info(`Loading proof schema: ${this.proof_schema_file}`);
			const file_promise = new Promise(((resolve, reject) => {
				fs.readFile(this.proof_schema_file, (error, file) => {
					if (error) return reject(error);
					resolve(file);
				});
			}));
			const proof_schema = JSON.parse(await file_promise);
			if (!proof_schema.name || !proof_schema.version) throw new Error('Invalid proof schema');
			this.proof_schema_template = proof_schema;
		}

		logger.info('Checking the proof for the proper attributes');
		const attributes = verification['info']['attributes'];

		// Make sure the proof schema attributes are present
		for (const key in this.proof_schema_template.requested_attributes) {
			const schema_attr = this.proof_schema_template.requested_attributes[key];

			logger.debug(`Checking proof for schema attribute: ${schema_attr.name}`);
			let accepted_proof_attr;
			for (const proof_index in attributes) {
				const proof_attr = attributes[proof_index];

				// Indy removes spaces and capital letters in proof response attribute names for some reason
				if (!proof_attr.name || proof_attr.name !== schema_attr.name.toLowerCase().split(' ').join('')) continue;

				// Make sure the requested attributes that had restrictions have a credential associated with them
				if (schema_attr.restrictions && schema_attr.restrictions.length && !proof_attr.cred_def_id)
					throw new Error(`Requested attribute ${schema_attr.name} did not have an associated credential`);

				logger.debug(`Attribute ${schema_attr.name} was present in the proof and verified`);
				accepted_proof_attr = proof_attr;
			}

			if (!accepted_proof_attr || !accepted_proof_attr.name || user_record.personal_info[schema_attr.name] !== accepted_proof_attr.value)
				throw new Error(`Verified attribute ${JSON.stringify(schema_attr.name)} did not match the user record`);

			logger.debug(`Proof attribute ${accepted_proof_attr.name} matches the user record`);
		}
		logger.info('Verified all proof attributes from the proof');
		return true;
	}
}

/**
 * Returns a purely self attested proof schema and always returns true when checking a proof.
 * @class
 * @implements {ProofHelper}
 */
class NullProofHelper {

	/**
	 * @param {boolean} pass_proofs Null proof help will always pass proofs if this is True and fail them otherwise.
	 */
	constructor (pass_proofs) {
		this.pass_proofs = !! pass_proofs;
	}

	async getProofSchema () {
		return {
			name: 'Dummy Proof Request',
			version: '1.0' + Date.now(),
			requested_attributes: {
				dummy_attribute: {
					name: 'dummy_attribute'
				}
			}
		};
	}

	async checkProof () {
		if (this.pass_proofs)
			return this.pass_proofs;
		else
			throw new Error('Proof was not accepted');
	}
}

/**
 * A helper class to mitigate the amount of hardcoding in the signup.js library.  Facilitates using a drivers license
 * and employment credential to get a bank account.
 * @class
 * @implements {SignupHelper}
 */
class AccountSignupHelper {

	/**
	 * Creates a AccountSignupHelper that will create proof requests asking for a drivers license and employment badge.
	 * @param {string} gleif_issuer The agent name for the GLIEF issuer.
	 * @param {string} lei_issuer The agent name for the LEI issuer.
	 * @param {string} proof_schema_path The path to a proof schema file.
	 * @param {Agent} agent An Agent instance capable of looking up schemas.
	 */
	constructor (gleif_issuer, lei_issuer, proof_schema_path, agent) {
		if (!gleif_issuer || typeof gleif_issuer !== 'string')
			throw new TypeError('Invalid HR issuer');
		if (!lei_issuer || typeof lei_issuer !== 'string')
			throw new TypeError('Invalid DMV issuer');
		if (!proof_schema_path || typeof proof_schema_path !== 'string')
			throw new TypeError('Invalid proof schema path for signup helper');
		if (!agent || typeof agent.getCredentialDefinitions !== 'function')
			throw new TypeError('Invalid agent');

		// Make sure the proof schema is a json file
		const ext = path.extname(proof_schema_path).toLowerCase().substring(1); // Remove the period in the extension
		if (ext !== 'json')
			throw new Error (`File ${proof_schema_path} is not a json file!`);

		// Make sure the image exists
		if (!fs.existsSync(proof_schema_path))
			throw new Error(`File ${proof_schema_path} does not exist`);

		this.gleif_issuer = gleif_issuer;
		this.lei_issuer = lei_issuer;
		this.proof_schema_path = proof_schema_path;
		this.agent = agent;
	}

	/**
	 * Sets up tagged connections to the DMV and HR apps so that we can use the `/credential_definitions?route=trustedLEIIssuer:true`
	 * or `/credential_definitions?route=trustedLEIIssuer:true` API calls to get their credential definition list later.
	 * @returns {Promise<void>} A promise that resolves when the tagged connections are established.
	 */
	async setup () {
		let to = {};
		if (this.lei_issuer.toLowerCase().indexOf('http') >= 0)
			to.url = this.lei_issuer;
		else
			to.name = this.lei_issuer;

		logger.info(`Setting up a connection to trusted issuer: ${JSON.stringify(to)}`);
		let connection_offer = await this.agent.createConnection(to, {
			trustedLEIIssuer: 'true'
		});
		await this.agent.waitForConnection(connection_offer.id);
		logger.info(`Connection ${connection_offer.id} established`);

		to = {};
		if (this.gleif_issuer.toLowerCase().indexOf('http') >= 0)
			to.url = this.gleif_issuer;
		else
			to.name = this.gleif_issuer;

		logger.info(`Setting up a connection to trusted issuer: ${JSON.stringify(to)}`);
		connection_offer = await this.agent.createConnection(to, {
			trustedGLEIF: 'true'
		});
		await this.agent.waitForConnection(connection_offer.id);
		logger.info(`Connection ${connection_offer.id} established`);
	}

	/**
	 * Cleans up all the connections created for this signup flow.  Handy for when you need to change the properties
	 * you want to set on the connections to the issuers.
	 * @returns {Promise<void>} A promise that resolves when the connections created for this flow are deleted.
	 */
	async cleanup () {
		logger.info(`Cleaning up connections to the issuers: ${this.lei_issuer} and ${this.gleif_issuer}`);
		const connections = await this.agent.getConnections({
			$or: [
				{
					'remote.name': {$in: [ this.gleif_issuer, this.lei_issuer ]}
				},
				{
					'remote.url': {$in: [ this.gleif_issuer, this.lei_issuer ]}
				}
			]
		});
		logger.info(`Cleaning up ${connections.length} issuer connections`);
		for (const index in connections) {
			logger.debug(`Cleaning up connection ${connections[index].id}`);
			await this.agent.deleteConnection(connections[index].id);
		}
	}

	async getProofSchema (opts) {
		const PROOF_FORMAT = await new Promise((resolve, reject) => {
			logger.info(`Loading proof schema: ${this.proof_schema_path}`);
			fs.readFile(this.proof_schema_path, (error, file) => {
				if (error) return reject(error);
				file = JSON.parse(file);
				if (!file.name || !file.version)
					return reject(new Error('Invalid proof schema'));
				resolve(file);
			});
		});

		logger.info(`Looking up credential definitions for issuer ${this.lei_issuer}`);
		const lei_issuer_cred_defs = await this.agent.getCredentialDefinitions(null, {trustedLEIIssuer: 'true'});
		logger.debug(`${this.lei_issuer}'s credential definitions: ${JSON.stringify(lei_issuer_cred_defs, 0, 1)}`);
		const lei_issuer_restrictions = [];
		for (const agent_index in lei_issuer_cred_defs.agents) {
			const agent = lei_issuer_cred_defs.agents[agent_index];

			for (const cred_def_index in agent.results.items) {
				const cred_def_id = agent.results.items[cred_def_index].id;

				lei_issuer_restrictions.push({cred_def_id: cred_def_id});
			}
		}

		logger.info(`Making sure we still have a connection to ${this.gleif_issuer} and ${this.lei_issuer}`);
		await this.setup();

		logger.info(`Looking up credential definitions for issuer ${this.gleif_issuer}`);
		const gleif_cred_defs = await this.agent.getCredentialDefinitions(null, {trustedGLEIF: 'true'});
		logger.debug(`${this.gleif_issuer}'s credential definitions: ${JSON.stringify(gleif_cred_defs, 0, 1)}`);
		const gleif_restrictions = [];
		for (const agent_index in gleif_cred_defs.agents) {
			const agent = gleif_cred_defs.agents[agent_index];

			for (const cred_def_index in agent.results.items) {
				const cred_def_id = agent.results.items[cred_def_index].id;

				gleif_restrictions.push({cred_def_id: cred_def_id});
			}
		}

		const proof_request = {
			'name': PROOF_FORMAT.name,
			'version': PROOF_FORMAT.version + Date.now(),
			'requested_attributes': {}
		};
		for (const key in PROOF_FORMAT.requested_attributes) {
			const attribute = PROOF_FORMAT.requested_attributes[key].name;

			let restrictions = [];
			if (key.toLowerCase().indexOf('_lei') >= 0) {
				restrictions = lei_issuer_restrictions;
			} else if (key.toLowerCase().indexOf('_gleif') >= 0) {
				restrictions = gleif_restrictions;
			}
			proof_request.requested_attributes[attribute] = {
				name: attribute,
				restrictions: restrictions
			};
		}
		return proof_request;
	}

	async checkProof (verification, opts) {
		if (!verification || !verification.id || !verification.info || !verification.info.attributes)
			throw new TypeError('Invalid verification');

		logger.debug(`Displaying proof values for verification ${verification.id}:`);
		const proof_attributes = verification.info.attributes;
		const attributes = {};
		for (const i in proof_attributes) {
			const attr = proof_attributes[i];
			if (attr.cred_def_id)
				attributes[attr.name] = attr.value;

			logger.debug(`  ${attr['cred_def_id'] ? '*' : ' '}${attr.name} = ${attr.value}`);
		}
		logger.debug('(*Verified values from credential)');

		// Make sure the fields we need were provided
		if (!attributes.lei)
			throw new Error('Attestations of LEI was not provided');

		return verification;
	}

	async proofToUserRecord (verification) {
		if (!verification || !verification.id || !verification.info || !verification.info.attributes)
			throw new TypeError('Invalid verification');

		const proof_attributes = verification.info.attributes;
		const attributes = {};
		for (const i in proof_attributes) {
			const attr = proof_attributes[i];
			attributes[attr.name] = attr.value;
		}

		if (!attributes.lei) {
			throw new TypeError('Invalid verification');
		}
		let leinumber = attributes.lei;

		// retrieve LEI information
		return await this.buildUserRecordFromLEI(leinumber);
	}

	async buildUserRecordFromLEI(lei_number) {
		if (!lei_number) {
			return null;
		}
		// retrieve LEI information
		return new Promise((resolve, reject) => {
			const options = {
				method: 'GET',
				url: `https://leilookup.gleif.org/api/v2/leirecords?lei=${lei_number}`,
				json: true
			};

			request(options, (error, response, leiInfoArray) => {
				if (error) {
					console.debug(`Failed to find LEI info for ${lei_number}: ${JSON.stringify(error)}`);
					return httpResponse.status(500).sent({error: error.code, reason: error.message});
				}
				console.log(`Found LEI info for: ${lei_number}: ${JSON.stringify(leiInfoArray)}`);
				// make sure an array is coming back with only one item (since only one
				//  lei_number in the search)
				if (leiInfoArray && Array.isArray(leiInfoArray) && leiInfoArray.length === 1) {
					const leiInfo = leiInfoArray[0];
					let user_record = {};
					user_record.LEI = leiInfo.LEI.$;
					user_record.company_name = leiInfo.Entity.LegalName.$;
					user_record.address_line_1 = leiInfo.Entity.LegalAddress.FirstAddressLine.$;
					if (leiInfo.Entity.LegalAddress.AdditionalAddressLine && leiInfo.Entity.LegalAddress.AdditionalAddressLine.length > 0) {
						user_record.address_line_2 = leiInfo.Entity.LegalAddress.AdditionalAddressLine[0].$;
					}
					user_record.city = leiInfo.Entity.LegalAddress.City.$;
					user_record.state = leiInfo.Entity.LegalAddress.Region ? leiInfo.Entity.LegalAddress.Region.$ : "-";
					user_record.zip_code = leiInfo.Entity.LegalAddress.PostalCode.$;
					user_record.country = leiInfo.Entity.LegalAddress.Country.$;

					return resolve(user_record);
				}
			});

		});
	}
}

/**
 * Listens for and accepts incoming connection requests.  The AccountSignupHelper needs the other issuers to be running
 * one of these so that it can establish a connection to look up their credential definitions and build a proof schema.
 */
class ConnectionResponder {
	constructor (agent, interval) {
		if (!agent || typeof agent.getConnections !== 'function')
			throw new TypeError('Invalid agent for ConnectionResponder');
		if (interval !== undefined && typeof interval !== 'number' || interval < 0)
			throw new TypeError('Invalid polling interval for ConnectionResponder');
		this.agent = agent;
		this.stopped = true;
		this.interval = interval !== undefined ? interval : 3000;
	}

	async start () {
		this.stopped = false;

		async.until(
			() => { return this.stopped; },
			async () => {

				try {

					const offers = await this.agent.getConnections({
						state: 'inbound_offer'
					});
					logger.info('Connection Offers: ' + offers.length);
					if (offers.length > 0) {
						const offer = offers[0];
						try {
							logger.info(`Accepting connection offer ${offer.id} from  ${offer.remote.name}`);
							const r = await this.agent.acceptConnection(offer.id);
							logger.info(`Accepted connection offer ${r.id} from ${r.remote.name}`);
						} catch (error) {
							logger.error(`Couldn't accept connection offer ${offer.id}. Error: ${error}`);
							logger.info(`Deleting bad connection offer ${offer.id}`);
							await this.agent.deleteConnection(offer.id);
						}
					}
				} catch (error) {
					logger.error(`Failed to respond to connection requests: ${error}`);
				}

				return new Promise((resolve, reject) => {
					setTimeout(resolve, this.interval);
				});
			},
			(error) => {
				logger.error(`Stopping connection responder: ${error}`);
				this.stopped = false;
			}
		);
	}

	set_interval (interval) {
		if (typeof interval !== 'number' || interval < 0)
			throw new TypeError('ConnectionResponder interval must be >= 0');
		this.interval = interval;
	}

	async stop () {
		this.stopped = true;
	}
}

module.exports = {
	LoginHelper,
	NullProofHelper,
	AccountSignupHelper,
	ConnectionResponder
};