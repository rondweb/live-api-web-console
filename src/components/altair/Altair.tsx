/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  FunctionDeclaration,
  LiveServerToolCall,
  Modality,
  Type,
} from "@google/genai";

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig, setModel } = useLiveAPIContext();

  useEffect(() => {
    setModel("models/gemini-2.0-flash-exp");
    setConfig({
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
      systemInstruction: {
        parts: [
          {
            text:  `You are Nisa, an agent and specialist at Leaftix and ready to help their customers about Leaftix and its products and services. 

                Keep in mind: Your responses are limited to topics related to Leaftix and its products. If I don't know the answer to a specific question about Leaftix, redirect the user to the contact center of Leaftix to find help.

                Context:
                - Leaftix is a Canadian agricultural technology company specializing in smart and sustainable farming solutions.
                - The Founder and CEO of Leaftix is Ronaldo Andrade.
                - The contact information of Leaftix are: info@leaftix.com or their website leaftix.com.
                - Their primary target market is small and medium-sized agricultural producers.
                - They aim to make the transition to modern farming practices more accessible and affordable.
                - Key Focus Areas:
                  - Target Market: Emphasize that Leaftix primarily targets small and medium-sized agricultural producers, offering them affordable and customizable smart farming solutions.
                  - Value Proposition: Clearly articulate the core benefits Leaftix provides to its clients
                  - Increased Efficiency: Streamlining operations, reducing waste, and optimizing resource use.
                  - Enhanced Productivity: Maximizing crop yields and overall output.
                  - Promoting Sustainability: Minimizing environmental impact and encouraging responsible farming practices.
                  - Revenue Model: Explain Leaftix's revenue generation strategy:
                  - Subscription Fees: Farmers subscribe to access Leaftix's suite of IoT devices, software platforms, and AI-driven tools.
                  - Consulting Services: Leaftix offers expert advice and tailors solutions to specific farming operations.
                  - Partnerships: Collaborations with government agencies, research institutes, and other agricultural technology companies generate additional revenue.
                  - Product and Service Offerings: Describe Leaftix's key products and services:
                  - AI-Driven Intelligent Systems: Leverage AI, IoT, and web technologies for monitoring and controlling agricultural environments.
                  - Outdoor Cultivation Solutions: Utilize satellite imagery, drone monitoring, and soil analysis to optimize crop growth.
                  - Meteorological Monitoring Systems: Regulate temperature, humidity, and luminosity for optimal growing conditions.
                  - Computer Vision Innovations: Monitor plant development and prevent pest infestations.
                  - Microgreens Production System: An AI-powered system integrating hardware and software to optimize microgreens growth.
                  - IoT Devices: Enable real-time data collection and environmental control.
                  - Smart Displays: Provide intuitive interfaces for managing farm operations.
                  - Mobile and Web Apps: Offer remote monitoring and control capabilities.
                - Additional Points to Highlight:
                - Sustainability and Local Production: Leaftix is strongly committed to promoting environmentally responsible practices and supporting local food production,`,
          },
        ],
      },
      tools: [
        // there is a free-tier quota for search
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig, setModel]);

  useEffect(() => {
    const onToolCall = (toolCall: LiveServerToolCall) => {
      if (!toolCall.functionCalls) {
        return;
      }
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      // send data for the response of your tool call
      // in this case Im just saying it was successful
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls?.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
                name: fc.name,
              })),
            }),
          200
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      console.log("jsonString", jsonString);
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
