import { Tool } from "@langchain/core/tools";

/**
 * Dummy Weather Tool - Returns static weather data
 */
export class WeatherTool extends Tool {
  name = "weather_tool";
  description = "Get weather information for a city. Returns static mock data.";

  async _call(city: string): Promise<string> {
    const mockWeather = {
      city,
      temperature: "72°F",
      condition: "Partly Cloudy",
      humidity: "65%",
      wind: "10 mph NW",
      forecast: "Mild temperatures with occasional clouds throughout the day"
    };
    
    return JSON.stringify(mockWeather, null, 2);
  }
}

/**
 * Dummy Search Tool - Returns static search results
 */
export class SearchTool extends Tool {
  name = "web_search_tool";
  description = "Search the web for information. Returns static mock results.";

  async _call(query: string): Promise<string> {
    const mockResults = [
      {
        title: `Result 1 for: ${query}`,
        url: "https://example.com/result1",
        snippet: `This is a relevant result about ${query}. It contains useful information that might help answer questions.`
      },
      {
        title: `Result 2 for: ${query}`,
        url: "https://example.com/result2",
        snippet: `Another perspective on ${query}. This result provides additional context and details.`
      },
      {
        title: `Result 3 for: ${query}`,
        url: "https://example.com/result3",
        snippet: `Expert insights about ${query}. Comprehensive overview with practical examples.`
      }
    ];
    
    return JSON.stringify(mockResults, null, 2);
  }
}

/**
 * Calculator Tool - Performs basic arithmetic
 */
export class CalculatorTool extends Tool {
  name = "calculator_tool";
  description = "Perform basic arithmetic calculations";

  async _call(expression: string): Promise<string> {
    try {
      // Simple safe evaluation for basic math
      const sanitized = expression.replace(/[^0-9+\-*/().\s]/g, '');
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return `Result: ${result}`;
    } catch (error) {
      return `Error: Invalid expression - ${error.message}`;
    }
  }
}

// Export tool instances
export const weatherTool = new WeatherTool();
export const searchTool = new SearchTool();
export const calculatorTool = new CalculatorTool();

// Export all tools as array
export const allTools = [weatherTool, searchTool, calculatorTool];

// Tool registry for dynamic tool loading
export const toolRegistry: Record<string, Tool> = {
  weather_tool: weatherTool,
  web_search_tool: searchTool,
  calculator_tool: calculatorTool
};