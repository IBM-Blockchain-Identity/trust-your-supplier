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
 * A helper class to mitigate the amount of hardcoding in the signup.js library.  Facilitates using specific
 * credentials to construct an appropriate proof.
 * @class
 * @implements {SignupHelper}
 */
class AccountSignupHelper {

	/**
	 * Creates a AccountSignupHelper that will create proof requests asking for a TYS Credential and an IFT Founder Supplier ID
	 * @param {string} tys_issuer The agent name for the TYS issuer.
	 * @param {string} lei_issuer The agent name for the LEI issuer.
	 * @param {string} iftfounder_issuer The agent name for the IFT Founder Supplier issuer.
	 * @param {string} proof_schema_path_tys The path to a proof schema file with a TYS credential definition.
	 * @param {string} proof_schema_path_lei The path to a proof schema file with an LEI credential definition.
	 * @param {Agent} agent An Agent instance capable of looking up schemas.
	 */
	constructor (tys_issuer, lei_issuer, iftfounder_issuer, proof_schema_path_tys, proof_schema_path_lei, agent) {
		if (!tys_issuer || typeof tys_issuer !== 'string')
			throw new TypeError('Invalid TYS issuer');
		if (!lei_issuer || typeof lei_issuer !== 'string')
			throw new TypeError('Invalid LEI issuer');
		if (!iftfounder_issuer || typeof iftfounder_issuer !== 'string')
			throw new TypeError('Invalid IFT Founder issuer');
		if (!proof_schema_path_tys || typeof proof_schema_path_tys !== 'string')
			throw new TypeError('Invalid proof schema path for signup helper');
		if (!proof_schema_path_lei || typeof proof_schema_path_lei !== 'string')
			throw new TypeError('Invalid proof schema path for signup helper');
		if (!agent || typeof agent.getCredentialDefinitions !== 'function')
			throw new TypeError('Invalid agent');

		// Make sure the proof schema is a json file
		const ext = path.extname(proof_schema_path_tys).toLowerCase().substring(1); // Remove the period in the extension
		if (ext !== 'json')
			throw new Error (`File ${proof_schema_path_tys} is not a json file!`);

		const extn = path.extname(proof_schema_path_lei).toLowerCase().substring(1); // Remove the period in the extension
		if (extn !== 'json')
				throw new Error (`File ${proof_schema_path_lei} is not a json file!`);

		// Make sure the image exists
		if (!fs.existsSync(proof_schema_path_tys))
			throw new Error(`File ${proof_schema_path_tys} does not exist`);

		if (!fs.existsSync(proof_schema_path_lei))
			throw new Error(`File ${proof_schema_path_lei} does not exist`);

		this.tys_issuer = tys_issuer;
		this.lei_issuer = lei_issuer;
		this.iftfounder_issuer = iftfounder_issuer;
		this.proof_schema_path_tys = proof_schema_path_tys;
		this.proof_schema_path_lei = proof_schema_path_lei;
		this.agent = agent;
	}

	/**
	 * Sets up tagged connections to the TYS, LEI, and IFT Founder apps so that we can use the `/credential_definitions?route=trustedTYSIssuer:true`
	 * or `/credential_definitions?route=trustedLEIIssuer:true`, alongside the `/credential_definitions?route=trustedIFTFounderIssuer:true` API 
	 * calls to get their credential definition list later.
	 * @returns {Promise<void>} A promise that resolves when the tagged connections are established.
	 */
	async setup () {
		let to = {};
		if (this.iftfounder_issuer.toLowerCase().indexOf('http') >= 0)
			to.url = this.iftfounder_issuer;
		else
			to.name = this.iftfounder_issuer;

		logger.info(`Setting up a connection to trusted issuer: ${JSON.stringify(to)}`);
		let connection_offer = await this.agent.createConnection(to, {
			trustedIFTFounderIssuer: 'true'
		});
		await this.agent.waitForConnection(connection_offer.id);
		logger.info(`Connection ${connection_offer.id} established`);

		to = {};
		if (this.tys_issuer.toLowerCase().indexOf('http') >= 0)
			to.url = this.tys_issuer;
		else
			to.name = this.tys_issuer;

		logger.info(`Setting up a connection to trusted issuer: ${JSON.stringify(to)}`);
		connection_offer = await this.agent.createConnection(to, {
			trustedTYSIssuer: 'true'
		});
		await this.agent.waitForConnection(connection_offer.id);
		logger.info(`Connection ${connection_offer.id} established`);

		to = {};
		if (this.lei_issuer.toLowerCase().indexOf('http') >= 0)
			to.url = this.lei_issuer;
		else
			to.name = this.lei_issuer;

		logger.info(`Setting up a connection to trusted issuer: ${JSON.stringify(to)}`);
		connection_offer = await this.agent.createConnection(to, {
			trustedLEIIssuer: 'true'
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
		logger.info(`Cleaning up connections to the issuers: ${this.tys_issuer}, ${this.lei_issuer}, and ${this.iftfounder_issuer}`);
		const connections = await this.agent.getConnections({
			$or: [
				{
					'remote.name': {$in: [ this.tys_issuer, this.lei_issuer, this.iftfounder_issuer ]}
				},
				{
					'remote.url': {$in: [ this.tys_issuer, this.lei_issuer, this.iftfounder_issuer ]}
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
			// Choose the proof schema path based on the user's input: TYS or LEI
			let proof_schema_path = null;
			if (opts && opts.uselei && opts.uselei === true) {
				logger.info(`Loading proof schema: ${this.proof_schema_path_lei}`);
				proof_schema_path = this.proof_schema_path_lei;
			} else {
				logger.info(`Loading proof schema: ${this.proof_schema_path_tys}`);
				proof_schema_path = this.proof_schema_path_tys;
			}
			fs.readFile(proof_schema_path, (error, file) => {
				if (error) return reject(error);
				file = JSON.parse(file);
				if (!file.name || !file.version)
					return reject(new Error('Invalid proof schema'));
				resolve(file);
			});
		});

		logger.info(`Making sure we still have a connection to ${this.iftfounder_issuer}, ${this.tys_issuer} and ${this.lei_issuer}`);
		await this.setup();

		logger.info(`Looking up credential definitions for issuer ${this.iftfounder_issuer}`);
		const iftfounder_issuer_cred_defs = await this.agent.getCredentialDefinitions(null, {trustedIFTFounderIssuer: 'true'});
		logger.debug(`${this.iftfounder_issuer}'s credential definitions: ${JSON.stringify(iftfounder_issuer_cred_defs, 0, 1)}`);
		const iftfounder_issuer_restrictions = [];
		for (const agent_index in iftfounder_issuer_cred_defs.agents) {
			const agent = iftfounder_issuer_cred_defs.agents[agent_index];

			for (const cred_def_index in agent.results.items) {
				const cred_def_id = agent.results.items[cred_def_index].id;

				iftfounder_issuer_restrictions.push({cred_def_id: cred_def_id});
			}
		}
		
		logger.info(`Looking up credential definitions for issuer ${this.tys_issuer}`);
		const tys_issuer_cred_defs = await this.agent.getCredentialDefinitions(null, {trustedTYSIssuer: 'true'});
		logger.debug(`${this.tys_issuer}'s credential definitions: ${JSON.stringify(tys_issuer_cred_defs, 0, 1)}`);
		const tys_issuer_restrictions = [];
		for (const agent_index in tys_issuer_cred_defs.agents) {
			const agent = tys_issuer_cred_defs.agents[agent_index];

			for (const cred_def_index in agent.results.items) {
				const cred_def_id = agent.results.items[cred_def_index].id;

				tys_issuer_restrictions.push({cred_def_id: cred_def_id});
			}
		}

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

		const proof_request = {
			'name': PROOF_FORMAT.name,
			'version': PROOF_FORMAT.version + Date.now(),
			'requested_attributes': {}
		};
		for (const key in PROOF_FORMAT.requested_attributes) {
			const attribute = PROOF_FORMAT.requested_attributes[key].name;

			let restrictions = [];
			if (key.toLowerCase().indexOf('tys') >= 0) {
				restrictions = tys_issuer_restrictions;
			} else if (key.toLowerCase().indexOf('ift') >= 0) {
				restrictions = iftfounder_issuer_restrictions;
			} else if (key.toLowerCase().indexOf('lei') >= 0) {
				restrictions = lei_issuer_restrictions;
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
		// These come from the IFT Founder
		if (!attributes.company_name)
			throw new Error('A verified attestations of company name was not provided');

		if (!attributes.address_line_1 || !attributes.address_line_2 || !attributes.state || !attributes.zip_code || !attributes.city || !attributes.country)
			throw new Error('A verified attestation of address was not provided');

		if (!attributes.supplier_identifier)
			throw new Error('A verified attestation of a supplier identifier was not provided');

		if (!attributes.supplier_rating)
			throw new Error('A verified attestation of supplier rating was not provided');

		if (!attributes.supplier_since)
			throw new Error('A verified attestation of supplier since was not provided');

			// These come from the TYS or the LEI, and we need either TYS creds or LEI cred
		if ((!attributes.lei) && (!attributes.tys_identifier || !attributes.trust_value || !attributes.member_since ))
			throw new Error('A verified attestation of the required TYS identifier or LEI was not provided');

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

		return {
			company_name: attributes.company_name,
			address_line_1: attributes.address_line_1,
			address_line_2: attributes.address_line_2,
			city: attributes.city,
			state: attributes.state,
			zip_code: attributes.zip_code,
			country: attributes.country,
			tax_id: attributes.tax_id,
			supplier_identifier: attributes.supplier_identifier,
			supplier_rating: attributes.supplier_rating,
			supplier_since: attributes.supplier_since,
			tys_identifier: attributes.tys_identifier,
			trust_value: attributes.trust_value,
			member_since: attributes.member_since,
			member_identifier: uuidv4(),
			lei: attributes.lei
		};
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