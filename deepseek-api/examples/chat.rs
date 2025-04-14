use deepseek_api::DeepSeekClient;
use dotenv::dotenv;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    
    let client = DeepSeekClient::new()?;
    let response = client.chat("Hello, how are you?").await?;
    
    println!("Response: {}", response);
    Ok(())
}
