import type { ProgramKind } from 'ast-types/gen/kinds'
import * as recast from 'recast'
import * as typeScriptParser from 'recast/parsers/typescript'
import { test, expect, describe } from 'vitest'

import { runPipeline } from '../../../codegen'
import { fs, CollectedGraphQLDocument, path } from '../../../lib'
import { mockCollectedDoc, testConfig } from '../../../test'

// the config to use in tests
const config = testConfig()

// the documents to test
const docs: CollectedGraphQLDocument[] = [
	mockCollectedDoc(`query TestQuery { version }`),
	mockCollectedDoc(`fragment TestFragment on User { firstName }`),
]

test('generates an artifact for every document', async function () {
	// execute the generator
	await runPipeline(config, docs)

	// look up the files in the artifact directory
	const files = await fs.readdir(config.artifactDirectory)

	// and they have the right names
	expect(files).toEqual(expect.arrayContaining(['TestQuery.js', 'TestFragment.js']))
})

test('adds kind, name, and raw, response, and selection', async function () {
	// execute the generator
	await runPipeline(config, docs)

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(config.artifactPath(docs[0].document)))
	expect(queryContents).toBeTruthy()
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "8e483259f3d69f416c01b6106c0440fa0f916abb4cadb75273f8226a1ff0a5e2",

		    raw: \`query TestQuery {
		  version
		}
		\`,

		    rootType: "Query",

		    selection: {
		        version: {
		            type: "Int",
		            keyRaw: "version"
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=4e7afee5e8aa689ee7f58f61f60955769c29fe630b05a32ca2a5d8f61620afe3";
	`)

	const fragmentContents = await fs.readFile(path.join(config.artifactPath(docs[1].document)))
	expect(fragmentContents).toBeTruthy()
	// parse the contents
	const parsedFragment: ProgramKind = recast.parse(fragmentContents!, {
		parser: typeScriptParser,
	}).program
	// and verify their content
	expect(parsedFragment).toMatchInlineSnapshot(`
		export default {
		    name: "TestFragment",
		    kind: "HoudiniFragment",
		    hash: "29c40b5d9f6b0cd77fc3fb46fc1338be4960369a01651d5149c2442a33b48686",

		    raw: \`fragment TestFragment on User {
		  firstName
		}
		\`,

		    rootType: "User",

		    selection: {
		        firstName: {
		            type: "String",
		            keyRaw: "firstName"
		        }
		    }
		};

		"HoudiniHash=7af5be069af3b67c394042bdd7c12f46058ba9d372d38e67f5613fc3d0a2aaff";
	`)
})

test('selection includes fragments', async function () {
	// the documents to test
	const selectionDocs: CollectedGraphQLDocument[] = [
		mockCollectedDoc(`query TestQuery { user { ...TestFragment } }`),
		mockCollectedDoc(`fragment TestFragment on User { firstName }`),
	]

	// execute the generator
	await runPipeline(config, selectionDocs)

	//
	// load the contents of the file
	const queryContents = await fs.readFile(
		path.join(config.artifactPath(selectionDocs[0].document))
	)
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "2d52c61126b6514cd0f51584ae220d583c1df1db1090d2b44da83b7f59a4022c",

		    raw: \`query TestQuery {
		  user {
		    ...TestFragment
		    id
		  }
		}

		fragment TestFragment on User {
		  firstName
		}
		\`,

		    rootType: "Query",

		    selection: {
		        user: {
		            type: "User",
		            keyRaw: "user",

		            fields: {
		                firstName: {
		                    type: "String",
		                    keyRaw: "firstName"
		                },

		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                }
		            }
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=c8c8290bb733a727894c836300cd22e8ece993f2b7c2108998f1d63a595e6b5f";
	`)

	const fragmentContents = await fs.readFile(path.join(config.artifactPath(docs[1].document)))
	expect(fragmentContents).toBeTruthy()
	// parse the contents
	const parsedFragment: ProgramKind = recast.parse(fragmentContents!, {
		parser: typeScriptParser,
	}).program
	// and verify their content
	expect(parsedFragment).toMatchInlineSnapshot(`
		export default {
		    name: "TestFragment",
		    kind: "HoudiniFragment",
		    hash: "29c40b5d9f6b0cd77fc3fb46fc1338be4960369a01651d5149c2442a33b48686",

		    raw: \`fragment TestFragment on User {
		  firstName
		}
		\`,

		    rootType: "User",

		    selection: {
		        firstName: {
		            type: "String",
		            keyRaw: "firstName"
		        }
		    }
		};

		"HoudiniHash=7af5be069af3b67c394042bdd7c12f46058ba9d372d38e67f5613fc3d0a2aaff";
	`)
})

test('internal directives are scrubbed', async function () {
	// execute the generator
	await runPipeline(config, [
		mockCollectedDoc(`fragment A on User { firstName }`),
		mockCollectedDoc(`query TestQuery { user { ...A @prepend } }`),
	])

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(config.artifactPath(docs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "d602ba63b61c244225db2524918578e52cc0c1b06a512b56064deb7d176f8e30",

		    raw: \`query TestQuery {
		  user {
		    ...A
		    id
		  }
		}

		fragment A on User {
		  firstName
		}
		\`,

		    rootType: "Query",

		    selection: {
		        user: {
		            type: "User",
		            keyRaw: "user",

		            fields: {
		                firstName: {
		                    type: "String",
		                    keyRaw: "firstName"
		                },

		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                }
		            }
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=44c6f321536709f2a75b34d7bf4a4db2387bed848fd2956e592a13817d1399ff";
	`)
})

test('variables only used by internal directives are scrubbed', async function () {
	// execute the generator
	await runPipeline(config, [
		mockCollectedDoc(`fragment A on User { firstName }`),
		mockCollectedDoc(
			`query TestQuery($parentID: ID!) {
				user {
					...A @prepend(parentID: $parentID)
				}
			}`
		),
	])

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(config.artifactPath(docs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program

	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "d602ba63b61c244225db2524918578e52cc0c1b06a512b56064deb7d176f8e30",

		    raw: \`query TestQuery {
		  user {
		    ...A
		    id
		  }
		}

		fragment A on User {
		  firstName
		}
		\`,

		    rootType: "Query",

		    selection: {
		        user: {
		            type: "User",
		            keyRaw: "user",

		            fields: {
		                firstName: {
		                    type: "String",
		                    keyRaw: "firstName"
		                },

		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                }
		            }
		        }
		    },

		    input: {
		        fields: {
		            parentID: "ID"
		        },

		        types: {}
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=efafd620e8ee6999336778e8467eb5184c1d92e71393723cc857f4235d2a66b0";
	`)
})

test('overlapping query and fragment selection', async function () {
	// execute the generator
	await runPipeline(config, [
		mockCollectedDoc(`fragment A on User { firstName }`),
		mockCollectedDoc(`query TestQuery { user { firstName ...A @prepend } }`),
	])

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(config.artifactPath(docs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "89ff86b7807db8c5395ab994977ca62e2af6a50b78add45f306d6730faa17cdf",

		    raw: \`query TestQuery {
		  user {
		    firstName
		    ...A
		    id
		  }
		}

		fragment A on User {
		  firstName
		}
		\`,

		    rootType: "Query",

		    selection: {
		        user: {
		            type: "User",
		            keyRaw: "user",

		            fields: {
		                firstName: {
		                    type: "String",
		                    keyRaw: "firstName"
		                },

		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                }
		            }
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=234b7407fd0adcee65c73e0a206119449dee083c784bddff5bf4a9ef726a1dba";
	`)
})

test('overlapping query and fragment nested selection', async function () {
	// execute the generator
	await runPipeline(config, [
		mockCollectedDoc(`fragment A on User { friends { id } }`),
		mockCollectedDoc(`query TestQuery { user { friends { firstName } ...A @prepend } }`),
	])

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(config.artifactPath(docs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "58b9fbe10de1dedb58d303b2e492b01192c69daceafd1060e433f40f9b4d6eb0",

		    raw: \`query TestQuery {
		  user {
		    friends {
		      firstName
		      id
		    }
		    ...A
		    id
		  }
		}

		fragment A on User {
		  friends {
		    id
		  }
		}
		\`,

		    rootType: "Query",

		    selection: {
		        user: {
		            type: "User",
		            keyRaw: "user",

		            fields: {
		                friends: {
		                    type: "User",
		                    keyRaw: "friends",

		                    fields: {
		                        firstName: {
		                            type: "String",
		                            keyRaw: "firstName"
		                        },

		                        id: {
		                            type: "ID",
		                            keyRaw: "id"
		                        }
		                    }
		                },

		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                }
		            }
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=a7f167e15c06d8c7ea633e038190ebf0a27242880451f59b4bd30adba4ac5139";
	`)
})

test('selections with interfaces', async function () {
	const cfg = testConfig({ module: 'esm' })
	const mutationDocs = [
		mockCollectedDoc(
			`query Friends {
					friends {
                        ... on Cat {
                            id
							owner {
								firstName
							}
                        }
                        ... on Ghost {
                            name
                        }
					}
				}`
		),
	]

	// execute the generator
	await runPipeline(cfg, mutationDocs)

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(cfg.artifactPath(mutationDocs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "Friends",
		    kind: "HoudiniQuery",
		    hash: "359c4d6ceae8e5a5411fa160c2ffaf61e714d7c82a0f1816244f8a83291a2863",

		    raw: \`query Friends {
		  friends {
		    ... on Cat {
		      id
		      owner {
		        firstName
		        id
		      }
		    }
		    ... on Ghost {
		      name
		    }
		    __typename
		  }
		}
		\`,

		    rootType: "Query",

		    selection: {
		        friends: {
		            type: "Friend",
		            keyRaw: "friends",

		            fields: {
		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                },

		                owner: {
		                    type: "User",
		                    keyRaw: "owner",

		                    fields: {
		                        firstName: {
		                            type: "String",
		                            keyRaw: "firstName"
		                        },

		                        id: {
		                            type: "ID",
		                            keyRaw: "id"
		                        }
		                    }
		                },

		                name: {
		                    type: "String",
		                    keyRaw: "name"
		                },

		                __typename: {
		                    type: "String",
		                    keyRaw: "__typename"
		                }
		            },

		            abstract: true
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=09afcd76aca08a3f81221edfb55d165b5241ae8fae5fc1dd42f54f5dec35eb25";
	`)
})

test('selections with unions', async function () {
	const cfg = testConfig({ module: 'esm' })
	const mutationDocs = [
		mockCollectedDoc(
			`query Friends {
					entities {
                        ... on Cat {
                            id
							owner {
								firstName
							}
                        }
                        ... on Ghost {
                            name
                        }
					}
				}`
		),
	]

	// execute the generator
	await runPipeline(cfg, mutationDocs)

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(cfg.artifactPath(mutationDocs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "Friends",
		    kind: "HoudiniQuery",
		    hash: "512c81f0e5ea88525b407c9978620c931d4e8bc41317d9bd6eeaf3338fe40c6c",

		    raw: \`query Friends {
		  entities {
		    ... on Cat {
		      id
		      owner {
		        firstName
		        id
		      }
		    }
		    ... on Ghost {
		      name
		    }
		    __typename
		  }
		}
		\`,

		    rootType: "Query",

		    selection: {
		        entities: {
		            type: "Entity",
		            keyRaw: "entities",

		            fields: {
		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                },

		                owner: {
		                    type: "User",
		                    keyRaw: "owner",

		                    fields: {
		                        firstName: {
		                            type: "String",
		                            keyRaw: "firstName"
		                        },

		                        id: {
		                            type: "ID",
		                            keyRaw: "id"
		                        }
		                    }
		                },

		                name: {
		                    type: "String",
		                    keyRaw: "name"
		                },

		                __typename: {
		                    type: "String",
		                    keyRaw: "__typename"
		                }
		            },

		            abstract: true
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=f11d375eb2ec0b5373b2e717f97a1464c3c2ec470f9b17ad5693c1ff98c9c121";
	`)
})

describe('mutation artifacts', function () {
	test('empty operation list', async function () {
		const cfg = testConfig({ module: 'esm' })

		const mutationDocs = [
			mockCollectedDoc(
				`mutation B {
					addFriend {
						friend {
							firstName
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(cfg, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(cfg.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "B",
			    kind: "HoudiniMutation",
			    hash: "38005b47351eb4e6e14e3c13a8d0d206dac09bf80d6fa3c103a060a3990edd37",

			    raw: \`mutation B {
			  addFriend {
			    friend {
			      firstName
			      id
			    }
			  }
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=2203fdd50e58f77227a36975144992028bedf3cb08264335f5b3af73913f0b2f";
		`)
	})

	test('insert operation', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "last"
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=c2cee63cc2dfd5eabad47ed394b64c91f6e19378bbf018b80c6e3391c3a56e5b";
		`)
	})

	test('toggle operation', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_toggle @prepend
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "2a821dc72c7f92a67ff9fcef569c4cadaf9852662035b32d015c4af67e57aca3",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_toggle
			      id
			    }
			  }
			}

			fragment All_Users_toggle on User {
			  firstName
			  id
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "toggle",
			                        list: "All_Users",
			                        position: "first"
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=cc9a6fb32e9b6a79e2a3c46885d07b11078f84dcb8c52555fb96e3ff6f87f8b2";
		`)
	})

	test('remove operation', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_remove
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "9dc41329a7176f813b623958a68c2752d391151a4f3b1f9b8198f6c487e931a4",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_remove
			      id
			    }
			  }
			}

			fragment All_Users_remove on User {
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "remove",
			                        list: "All_Users"
			                    }],

			                    fields: {
			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=a33810e6e3850879918dc77009577f72a2cab24664911bb0a1e57b47c6b7d104";
		`)
	})

	test('delete operation', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					deleteUser(id: "1234") {
						userID @User_delete
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "b9e1e926be309c06c868dc2472c082b6829f93ae55e000317a1066378590a85d",

			    raw: \`mutation A {
			  deleteUser(id: "1234") {
			    userID
			  }
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        deleteUser: {
			            type: "DeleteUserOutput",
			            keyRaw: "deleteUser(id: \\"1234\\")",

			            fields: {
			                userID: {
			                    type: "ID",
			                    keyRaw: "userID",

			                    operations: [{
			                        action: "delete",
			                        type: "User"
			                    }]
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=02916c12509a82eb42926c996cc383fde93bc550a72887cd6cf259a1164543da";
		`)
	})

	test('delete operation with condition', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					deleteUser(id: "1234") {
						userID @User_delete @when(stringValue: "foo")
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "b9e1e926be309c06c868dc2472c082b6829f93ae55e000317a1066378590a85d",

			    raw: \`mutation A {
			  deleteUser(id: "1234") {
			    userID
			  }
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        deleteUser: {
			            type: "DeleteUserOutput",
			            keyRaw: "deleteUser(id: \\"1234\\")",

			            fields: {
			                userID: {
			                    type: "ID",
			                    keyRaw: "userID",

			                    operations: [{
			                        action: "delete",
			                        type: "User",

			                        when: {
			                            must: {
			                                stringValue: "foo"
			                            }
			                        }
			                    }]
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=da85d1acef7d12c0a3185f625a7f77a22a4d2ec90fc91d1a919aefd9209db113";
		`)
	})

	test('parentID - prepend', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @prepend(parentID: "1234")
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "first",

			                        parentID: {
			                            kind: "String",
			                            value: "1234"
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=75b2d544c45b48e48203138c3a204afdaa382c1673acaba9db9511ee6c929553";
		`)
	})

	test('parentID - append', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @append(parentID: "1234")
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "last",

			                        parentID: {
			                            kind: "String",
			                            value: "1234"
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=d585c80adc7fbc932f9cda5a3053b922baf1affa035b7c0b239cc38f65e6e4ed";
		`)
	})

	test('parentID - parentID directive', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @parentID(value: "1234")
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "last",

			                        parentID: {
			                            kind: "String",
			                            value: "1234"
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=269dd0acb58d7a44b0df6d6a53ed1beaeb5aca5cc216d8011b29425d2eed6584";
		`)
	})

	test('must - prepend', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @prepend(when: { stringValue: "foo" })
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "first",

			                        when: {
			                            must: {
			                                stringValue: "foo"
			                            }
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=5bbd672c18c5febf61cf8335145d6f837b1e711ec3f1a1d5b81241767444c8ed";
		`)
	})

	test('must - append', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @append(when: { stringValue: "true" })
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "last",

			                        when: {
			                            must: {
			                                stringValue: "true"
			                            }
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=8b57b4d6231aeadc73661b6096f815d1f59fa9bb44e62b363d72c7dfcd78048f";
		`)
	})

	test('must - directive', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @when(stringValue: "true")
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "last",

			                        when: {
			                            must: {
			                                stringValue: "true"
			                            }
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=c6990945263aa9f52111e9cc0d89b6ccad2a258ca5356f6cf23a7e9424354aa7";
		`)
	})

	test('must_not - prepend', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @prepend(when_not: { stringValue: "true" })
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "first",

			                        when: {
			                            must_not: {
			                                stringValue: "true"
			                            }
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=d7fca173168e1a7c842115c468d62ff9d347724c0a8fa20a3408771eef5c7cf9";
		`)
	})

	test('must_not - append', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @append(when_not: { stringValue: "true" })
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "last",

			                        when: {
			                            must_not: {
			                                stringValue: "true"
			                            }
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=cc5ca165e8418fe5ac352c3067402d6aca3c1e76c25efdad5d076dbf294e2554";
		`)
	})

	test('list filters', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @when_not(boolValue: true)
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery($value: String!) {
					users(
						stringValue: $value,
						boolValue: true,
						floatValue: 1.2,
						intValue: 1,
					) @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[1].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "TestQuery",
			    kind: "HoudiniQuery",
			    hash: "d773bead4120baa620dc05347fba277faaa5bb555e10943507a393eaa3399c52",

			    raw: \`query TestQuery($value: String!) {
			  users(stringValue: $value, boolValue: true, floatValue: 1.2, intValue: 1) {
			    firstName
			    id
			  }
			}
			\`,

			    rootType: "Query",

			    selection: {
			        users: {
			            type: "User",
			            keyRaw: "users(stringValue: $value, boolValue: true, floatValue: 1.2, intValue: 1)",

			            list: {
			                name: "All_Users",
			                connection: false,
			                type: "User"
			            },

			            fields: {
			                firstName: {
			                    type: "String",
			                    keyRaw: "firstName"
			                },

			                id: {
			                    type: "ID",
			                    keyRaw: "id"
			                }
			            },

			            filters: {
			                stringValue: {
			                    kind: "Variable",
			                    value: "value"
			                },

			                boolValue: {
			                    kind: "Boolean",
			                    value: true
			                },

			                floatValue: {
			                    kind: "Float",
			                    value: 1.2
			                },

			                intValue: {
			                    kind: "Int",
			                    value: 1
			                }
			            }
			        }
			    },

			    input: {
			        fields: {
			            value: "String"
			        },

			        types: {}
			    },

			    policy: "CacheOrNetwork",
			    partial: false
			};

			"HoudiniHash=f0b0082b38e66bc9fcefcd11741b874cacb74a1a939221c1618b499df139b356";
		`)
	})

	test('must_not - directive', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @when_not(boolValue: true)
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo", boolValue:true) @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "A",
			    kind: "HoudiniMutation",
			    hash: "7cc5c23ffd19603e2c7c727d1ac2726d4d87ee6b0470ced7d28c7f0ed88a05c2",

			    raw: \`mutation A {
			  addFriend {
			    friend {
			      ...All_Users_insert
			      id
			    }
			  }
			}

			fragment All_Users_insert on User {
			  firstName
			  id
			}
			\`,

			    rootType: "Mutation",

			    selection: {
			        addFriend: {
			            type: "AddFriendOutput",
			            keyRaw: "addFriend",

			            fields: {
			                friend: {
			                    type: "User",
			                    keyRaw: "friend",

			                    operations: [{
			                        action: "insert",
			                        list: "All_Users",
			                        position: "last",

			                        when: {
			                            must_not: {
			                                boolValue: true
			                            }
			                        }
			                    }],

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=a29794de026215f4e9266358741cf0ab3876640e1230e3dc190907d5cc7c1c37";
		`)
	})

	test('tracks list name', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @prepend(parentID: "1234")
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					users(stringValue: "foo") @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[1].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "TestQuery",
			    kind: "HoudiniQuery",
			    hash: "2997353b3d1f04e02b9d211bb4f4069b63f8536b7f1eb686fc74fd8b3dab8dbd",

			    raw: \`query TestQuery {
			  users(stringValue: "foo") {
			    firstName
			    id
			  }
			}
			\`,

			    rootType: "Query",

			    selection: {
			        users: {
			            type: "User",
			            keyRaw: "users(stringValue: \\"foo\\")",

			            list: {
			                name: "All_Users",
			                connection: false,
			                type: "User"
			            },

			            fields: {
			                firstName: {
			                    type: "String",
			                    keyRaw: "firstName"
			                },

			                id: {
			                    type: "ID",
			                    keyRaw: "id"
			                }
			            },

			            filters: {
			                stringValue: {
			                    kind: "String",
			                    value: "foo"
			                }
			            }
			        }
			    },

			    policy: "CacheOrNetwork",
			    partial: false
			};

			"HoudiniHash=85351c80364eb41f7eae70628dd67dedfc2057a39ef3967c9e9b739e568b0f42";
		`)
	})

	test('tracks paginate name', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`mutation A {
					addFriend {
						friend {
							...All_Users_insert @prepend(parentID: "1234")
						}
					}
				}`
			),
			mockCollectedDoc(
				`query TestQuery {
					usersByCursor(first: 10) @paginate(name: "All_Users") {
						edges {
							node {
								firstName
							}
						}
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[1].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "TestQuery",
			    kind: "HoudiniQuery",
			    hash: "ae03169e8d96702d39c54183ece747c31f4b5d1e3abf54cf3fc0706abfd597b9",

			    refetch: {
			        update: "append",
			        path: ["usersByCursor"],
			        method: "cursor",
			        pageSize: 10,
			        embedded: false,
			        targetType: "Query",
			        paginated: true,
			        direction: "forward"
			    },

			    raw: \`query TestQuery($first: Int = 10, $after: String) {
			  usersByCursor(first: $first, after: $after) {
			    edges {
			      node {
			        firstName
			        id
			      }
			    }
			    edges {
			      cursor
			      node {
			        __typename
			      }
			    }
			    pageInfo {
			      hasPreviousPage
			      hasNextPage
			      startCursor
			      endCursor
			    }
			  }
			}
			\`,

			    rootType: "Query",

			    selection: {
			        usersByCursor: {
			            type: "UserConnection",
			            keyRaw: "usersByCursor::paginated",

			            list: {
			                name: "All_Users",
			                connection: true,
			                type: "User"
			            },

			            fields: {
			                edges: {
			                    type: "UserEdge",
			                    keyRaw: "edges",

			                    fields: {
			                        cursor: {
			                            type: "String",
			                            keyRaw: "cursor"
			                        },

			                        node: {
			                            type: "User",
			                            keyRaw: "node",
			                            nullable: true,

			                            fields: {
			                                __typename: {
			                                    type: "String",
			                                    keyRaw: "__typename"
			                                },

			                                firstName: {
			                                    type: "String",
			                                    keyRaw: "firstName"
			                                },

			                                id: {
			                                    type: "ID",
			                                    keyRaw: "id"
			                                }
			                            }
			                        }
			                    },

			                    update: "append"
			                },

			                pageInfo: {
			                    type: "PageInfo",
			                    keyRaw: "pageInfo",

			                    fields: {
			                        hasPreviousPage: {
			                            type: "Boolean",
			                            keyRaw: "hasPreviousPage"
			                        },

			                        hasNextPage: {
			                            type: "Boolean",
			                            keyRaw: "hasNextPage"
			                        },

			                        startCursor: {
			                            type: "String",
			                            keyRaw: "startCursor"
			                        },

			                        endCursor: {
			                            type: "String",
			                            keyRaw: "endCursor"
			                        }
			                    }
			                }
			            },

			            filters: {
			                first: {
			                    kind: "Variable",
			                    value: "first"
			                },

			                after: {
			                    kind: "Variable",
			                    value: "after"
			                }
			            }
			        }
			    },

			    input: {
			        fields: {
			            first: "Int",
			            after: "String"
			        },

			        types: {}
			    },

			    policy: "CacheOrNetwork",
			    partial: false
			};

			"HoudiniHash=9aec53bb0325a811ba8adfc41b04524f0ed859aa1b0f9d5e04d4bc02f639e52f";
		`)
	})

	test('field args', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`query TestQuery($value: String!) {
					users(
						stringValue: $value,
						boolValue: true,
						floatValue: 1.2,
						intValue: 1,
					) @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "TestQuery",
			    kind: "HoudiniQuery",
			    hash: "d773bead4120baa620dc05347fba277faaa5bb555e10943507a393eaa3399c52",

			    raw: \`query TestQuery($value: String!) {
			  users(stringValue: $value, boolValue: true, floatValue: 1.2, intValue: 1) {
			    firstName
			    id
			  }
			}
			\`,

			    rootType: "Query",

			    selection: {
			        users: {
			            type: "User",
			            keyRaw: "users(stringValue: $value, boolValue: true, floatValue: 1.2, intValue: 1)",

			            list: {
			                name: "All_Users",
			                connection: false,
			                type: "User"
			            },

			            fields: {
			                firstName: {
			                    type: "String",
			                    keyRaw: "firstName"
			                },

			                id: {
			                    type: "ID",
			                    keyRaw: "id"
			                }
			            },

			            filters: {
			                stringValue: {
			                    kind: "Variable",
			                    value: "value"
			                },

			                boolValue: {
			                    kind: "Boolean",
			                    value: true
			                },

			                floatValue: {
			                    kind: "Float",
			                    value: 1.2
			                },

			                intValue: {
			                    kind: "Int",
			                    value: 1
			                }
			            }
			        }
			    },

			    input: {
			        fields: {
			            value: "String"
			        },

			        types: {}
			    },

			    policy: "CacheOrNetwork",
			    partial: false
			};

			"HoudiniHash=f0b0082b38e66bc9fcefcd11741b874cacb74a1a939221c1618b499df139b356";
		`)
	})

	test('sveltekit', async function () {
		const cfg = testConfig({ module: 'esm' })

		const mutationDocs = [
			mockCollectedDoc(
				`query TestQuery($value: String!) {
					users(
						stringValue: $value,
						boolValue: true,
						floatValue: 1.2,
						intValue: 1,
					) @list(name: "All_Users") {
						firstName
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(cfg, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(cfg.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "TestQuery",
			    kind: "HoudiniQuery",
			    hash: "d773bead4120baa620dc05347fba277faaa5bb555e10943507a393eaa3399c52",

			    raw: \`query TestQuery($value: String!) {
			  users(stringValue: $value, boolValue: true, floatValue: 1.2, intValue: 1) {
			    firstName
			    id
			  }
			}
			\`,

			    rootType: "Query",

			    selection: {
			        users: {
			            type: "User",
			            keyRaw: "users(stringValue: $value, boolValue: true, floatValue: 1.2, intValue: 1)",

			            list: {
			                name: "All_Users",
			                connection: false,
			                type: "User"
			            },

			            fields: {
			                firstName: {
			                    type: "String",
			                    keyRaw: "firstName"
			                },

			                id: {
			                    type: "ID",
			                    keyRaw: "id"
			                }
			            },

			            filters: {
			                stringValue: {
			                    kind: "Variable",
			                    value: "value"
			                },

			                boolValue: {
			                    kind: "Boolean",
			                    value: true
			                },

			                floatValue: {
			                    kind: "Float",
			                    value: 1.2
			                },

			                intValue: {
			                    kind: "Int",
			                    value: 1
			                }
			            }
			        }
			    },

			    input: {
			        fields: {
			            value: "String"
			        },

			        types: {}
			    },

			    policy: "CacheOrNetwork",
			    partial: false
			};

			"HoudiniHash=f0b0082b38e66bc9fcefcd11741b874cacb74a1a939221c1618b499df139b356";
		`)
	})
})

test('custom scalar shows up in artifact', async function () {
	// define a config with a custom scalar
	const localConfig = testConfig({
		schema: `
			scalar DateTime
			type TodoItem {
				text: String!
				createdAt: DateTime!
			}
			type Query {
				allItems: [TodoItem!]!
			}
		`,
		scalars: {
			DateTime: {
				type: 'Date',
				unmarshal(val: number): Date {
					return new Date(val)
				},
				marshal(date: Date): number {
					return date.getTime()
				},
			},
		},
	})

	// execute the generator
	await runPipeline(localConfig, [mockCollectedDoc(`query TestQuery { allItems { createdAt } }`)])

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(config.artifactPath(docs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "b8314df1f7d924f76e6dfe6e7e3c8efd593db931c67c892311e97a9ec1d429b4",

		    raw: \`query TestQuery {
		  allItems {
		    createdAt
		  }
		}
		\`,

		    rootType: "Query",

		    selection: {
		        allItems: {
		            type: "TodoItem",
		            keyRaw: "allItems",

		            fields: {
		                createdAt: {
		                    type: "DateTime",
		                    keyRaw: "createdAt"
		                }
		            }
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=5eb3e999f486aba5c66170642f3d99537b7c17d793a9d8553533e3d949860213";
	`)
})

test('operation inputs', async function () {
	// the config to use in tests
	const localConfig = testConfig({
		schema: `
		enum MyEnum {
			Hello
		}

		input UserFilter {
			middle: NestedUserFilter
			listRequired: [String!]!
			nullList: [String]
			recursive: UserFilter
			enum: MyEnum
		}

		input NestedUserFilter {
			id: ID!
			firstName: String!
			admin: Boolean
			age: Int
			weight: Float
		}

		type User {
			id: ID!
		}

		type Query {
			user(id: ID, filter: UserFilter, filterList: [UserFilter!], enumArg: MyEnum): User
		}
	`,
	})

	// execute the generator
	await runPipeline(localConfig, [
		mockCollectedDoc(
			`
			query TestQuery(
				$id: ID,
				$filter: UserFilter,
				$filterList: [UserFilter!],
				$enumArg: MyEnum
			) {
				user(
					id: $id,
					filter: $filter,
					filterList: $filterList,
					enumArg: $enumArg,
				) {
					id
				}
			}
			`
		),
	])

	// load the contents of the file
	const queryContents = await fs.readFile(path.join(config.artifactPath(docs[0].document)))
	expect(queryContents).toBeTruthy()
	// parse the contents
	const parsedQuery: ProgramKind = recast.parse(queryContents!, {
		parser: typeScriptParser,
	}).program
	// verify contents
	expect(parsedQuery).toMatchInlineSnapshot(`
		export default {
		    name: "TestQuery",
		    kind: "HoudiniQuery",
		    hash: "f39d9c24c97c9c3cdcd916272e7ffb9d79cb4ad08ec294c829d647d4238c7e6b",

		    raw: \`query TestQuery($id: ID, $filter: UserFilter, $filterList: [UserFilter!], $enumArg: MyEnum) {
		  user(id: $id, filter: $filter, filterList: $filterList, enumArg: $enumArg) {
		    id
		  }
		}
		\`,

		    rootType: "Query",

		    selection: {
		        user: {
		            type: "User",
		            keyRaw: "user(id: $id, filter: $filter, filterList: $filterList, enumArg: $enumArg)",
		            nullable: true,

		            fields: {
		                id: {
		                    type: "ID",
		                    keyRaw: "id"
		                }
		            }
		        }
		    },

		    input: {
		        fields: {
		            id: "ID",
		            filter: "UserFilter",
		            filterList: "UserFilter",
		            enumArg: "MyEnum"
		        },

		        types: {
		            NestedUserFilter: {
		                id: "ID",
		                firstName: "String",
		                admin: "Boolean",
		                age: "Int",
		                weight: "Float"
		            },

		            UserFilter: {
		                middle: "NestedUserFilter",
		                listRequired: "String",
		                nullList: "String",
		                recursive: "UserFilter",
		                enum: "MyEnum"
		            }
		        }
		    },

		    policy: "CacheOrNetwork",
		    partial: false
		};

		"HoudiniHash=88c4ba560cbbe391ebfa655630a896a1a9933408dd8d20be26cf6685a2089a5a";
	`)
})

describe('subscription artifacts', function () {
	test('happy path', async function () {
		const mutationDocs = [
			mockCollectedDoc(
				`subscription B {
					newUser {
						user {
							firstName
						}
					}
				}`
			),
		]

		// execute the generator
		await runPipeline(config, mutationDocs)

		// load the contents of the file
		const queryContents = await fs.readFile(
			path.join(config.artifactPath(mutationDocs[0].document))
		)
		expect(queryContents).toBeTruthy()
		// parse the contents
		const parsedQuery: ProgramKind = recast.parse(queryContents!, {
			parser: typeScriptParser,
		}).program
		// verify contents
		expect(parsedQuery).toMatchInlineSnapshot(`
			export default {
			    name: "B",
			    kind: "HoudiniSubscription",
			    hash: "755fb65bebc83835db68921b7e193809246fb6f9ee2e37cc66d7314b91a501e7",

			    raw: \`subscription B {
			  newUser {
			    user {
			      firstName
			      id
			    }
			  }
			}
			\`,

			    rootType: "Subscription",

			    selection: {
			        newUser: {
			            type: "NewUserResult",
			            keyRaw: "newUser",

			            fields: {
			                user: {
			                    type: "User",
			                    keyRaw: "user",

			                    fields: {
			                        firstName: {
			                            type: "String",
			                            keyRaw: "firstName"
			                        },

			                        id: {
			                            type: "ID",
			                            keyRaw: "id"
			                        }
			                    }
			                }
			            }
			        }
			    }
			};

			"HoudiniHash=df5bc6be33a8a16e9353ff30c07e45d5e54531ab53157208255fdfec52c7b168";
		`)
	})
})
