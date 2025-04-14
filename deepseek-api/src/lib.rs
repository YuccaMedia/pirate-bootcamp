use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
}

#[derive(Debug, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: Message,
}

#[derive(Debug, Deserialize)]
struct ErrorResponse {
    error: ApiError,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    message: String,
    #[serde(rename = "type")]
    error_type: String,
    param: Option<String>,
    code: String,
}

pub struct DeepSeekClient {
    api_key: String,
    client: reqwest::Client,
}

impl DeepSeekClient {
    pub fn new() -> Result<Self> {
        let api_key = env::var("DEEPSEEK_API_KEY")?;
        let client = reqwest::Client::new();
        
        Ok(Self { api_key, client })
    }

    pub async fn chat(&self, prompt: &str) -> Result<String> {
        let request = ChatRequest {
            model: "deepseek-chat".to_string(),
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
            temperature: 0.7,
        };

        // First, get the raw response text
        let response_text = self.client
            .post("https://api.deepseek.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?
            .text()
            .await?;

        // Try to parse as error response first
        if let Ok(error_response) = serde_json::from_str::<ErrorResponse>(&response_text) {
            return Err(anyhow::anyhow!("API Error: {} (Code: {})", 
                error_response.error.message, 
                error_response.error.code));
        }

        // If not an error, try to parse as success response
        let response: ChatResponse = serde_json::from_str(&response_text)?;
        Ok(response.choices[0].message.content.clone())
    }
} 