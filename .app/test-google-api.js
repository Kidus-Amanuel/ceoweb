import fetch from 'node-fetch';

// Configure API key and model
const API_KEY = 'AIzaSyDpFejKmzdfO5iKa9GyteI6icYZkAjJpC4';
const MODEL_NAME = 'gemini-2.5-flash';
const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

// Mock function to simulate read_module_data
async function readModuleData(module, filters) {
    console.log('Mock read_module_data called:', module, filters);
    
    // Return mock data for CRM customers
    if (module === 'crm') {
        return [
            { id: 1, name: 'Acme Corp', status: 'active', email: 'contact@acmecorp.com' },
            { id: 2, name: 'Beta LLC', status: 'active', email: 'info@betallc.com' },
            { id: 3, name: 'Gamma Inc', status: 'inactive', email: 'support@gammainc.com' }
        ];
    }
    
    return [];
}

async function testGoogleAPI() {
    try {
        console.log('Testing Google Generative AI API...');
        
        // Step 1: Initial request to get the function call
        const initialRequestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: "You are an ERP assistant. Always use the tool `read_module_data` to fetch facts. Never access the database directly.\n\n## Agent Workflow:\n1. When you need data, explicitly plan a tool call with `read_module_data`\n2. Wait for the result\n3. Craft the reply using only the fetched data\n4. Keep output strictly within compact markup (cards, buttons, tables)\n5. Avoid verbose prose and raw data dumps\n\n## Markup Guidelines:\n- Use <card title=\"...\" subtitle=\"...\" link=\"...\" /> for single record summaries\n- Use <button action=\"...\" label=\"...\" /> for user actions or navigation\n- Use <table columns=\"col1,col2\" rows=\"[[rl1,rl2],[r2c1,r2c2]]\" /> for small datasets (max 5 rows)\n- Keep plain text brief (1-2 sentences max)\n\n## Allowed Modules:\n- crm: Customers, deals, activities\n- fleet: Vehicles, drivers, shipments, maintenance\n- inventory: Products, warehouses, purchase orders, vendors\n\n## Example Responses:\n- \"I found 3 active customers. Here's a summary:\"\n  <card title=\"Customer: Acme Corp\" subtitle=\"Status: Active\" link=\"/crm/customers/123\" />\n  <card title=\"Customer: Beta LLC\" subtitle=\"Status: Active\" link=\"/crm/customers/456\" />\n  <button action=\"view_all\" label=\"View All Customers\" />\n\n- \"Your fleet has 2 vehicles due for maintenance:\":\n  <table columns=\"Vehicle,Last Service,Mileage\" rows=\"[['Truck-123','2024-01-15','45000'],['Van-456','2024-02-20','38000']]\" />\n  <button action=\"schedule_maintenance\" label=\"Schedule Maintenance\" />\n\nOutput must be compact markup only. Do not write long text.\n\nHow many CRM customers are there?"
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024
            },
            tools: [
                {
                    function_declarations: [
                        {
                            name: "read_module_data",
                            description: "Fetch rows from crm, fleet or inventory",
                            parameters: {
                                type: "object",
                                properties: {
                                    module: {
                                        type: "string",
                                        description: "Module name (crm, fleet, or inventory)"
                                    },
                                    filters: {
                                        type: "object",
                                        description: "Filters to apply to the data"
                                    }
                                },
                                required: ["module"]
                            }
                        }
                    ]
                }
            ]
        };

        const initialResponse = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(initialRequestBody)
        });

        if (!initialResponse.ok) {
            console.error(`Initial API Error: ${initialResponse.status} ${initialResponse.statusText}`);
            const errorText = await initialResponse.text();
            console.error('Error details:', errorText);
            return;
        }

        const initialData = await initialResponse.json();
        console.log('Initial API Response:', JSON.stringify(initialData, null, 2));

        // Step 2: Check if we need to execute a function
        if (initialData.candidates && initialData.candidates.length > 0) {
            const candidate = initialData.candidates[0];
            
            if (candidate.content && candidate.content.parts && candidate.content.parts[0].functionCall) {
                const functionCall = candidate.content.parts[0].functionCall;
                console.log('Function to call:', functionCall);

                // Step 3: Execute the function
                let functionResult;
                if (functionCall.name === 'read_module_data') {
                    functionResult = await readModuleData(functionCall.args.module, functionCall.args.filters);
                }

                // Step 4: Send the function response back to the model
                const followupRequestBody = {
                    contents: [
                        ...initialRequestBody.contents,
                        {
                            parts: [
                                {
                                    functionCall: functionCall
                                }
                            ],
                            role: 'model'
                        },
                        {
                            parts: [
                                {
                                    functionResponse: {
                                        name: functionCall.name,
                                        response: {
                                            name: functionCall.name,
                                            content: JSON.stringify(functionResult)
                                        }
                                    }
                                }
                            ],
                            role: 'user'
                        }
                    ],
                    generationConfig: initialRequestBody.generationConfig,
                    tools: initialRequestBody.tools
                };

                const followupResponse = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(followupRequestBody)
                });

                if (!followupResponse.ok) {
                    console.error(`Follow-up API Error: ${followupResponse.status} ${followupResponse.statusText}`);
                    const errorText = await followupResponse.text();
                    console.error('Error details:', errorText);
                    return;
                }

                const followupData = await followupResponse.json();
                console.log('Follow-up API Response:', JSON.stringify(followupData, null, 2));

                // Step 5: Extract the final response
                if (followupData.candidates && followupData.candidates.length > 0) {
                    const finalCandidate = followupData.candidates[0];
                    if (finalCandidate.content && finalCandidate.content.parts && finalCandidate.content.parts.length > 0) {
                        console.log('\nFinal Generated Text:', finalCandidate.content.parts[0].text);
                    } else {
                        console.log('No text content in final response');
                    }
                } else {
                    console.log('No candidates in final response');
                }

            } else if (candidate.content && candidate.content.parts && candidate.content.parts[0].text) {
                console.log('\nGenerated Text:', candidate.content.parts[0].text);
            } else {
                console.log('No content in initial response');
            }
        } else {
            console.log('No candidates in initial response');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testGoogleAPI();
