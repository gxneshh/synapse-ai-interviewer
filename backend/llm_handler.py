"""
Language Model handler using OpenAI GPT-4o
Generates intelligent interview questions and responses
"""
import asyncio
from openai import AsyncOpenAI
from config import settings


class LLMHandler:
    """LLM integration using OpenAI GPT-4o"""

    def __init__(self, resume_text: str = "", job_description: str = ""):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.LLM_MODEL
        self.resume = resume_text
        self.job_description = job_description
        self.conversation_history = []
        self.system_prompt = self._build_system_prompt()

    def _build_system_prompt(self) -> str:
        """Build the system prompt for the interviewer"""
        base_prompt = """You are an expert technical interviewer conducting a professional interview.
You are having a real-time conversation with a candidate via video call.

IMPORTANT INSTRUCTIONS:
1. Keep responses SHORT and CONVERSATIONAL (2-3 sentences max)
2. Ask one question at a time
3. Listen to the candidate's answer and ask follow-ups
4. Be encouraging and professional
5. Adapt your questions based on their responses
6. Think about what the next question should be, not just repeat what they said

INTERVIEW FLOW:
- Start with an easy question to warm up
- Progress to more technical topics
- Ask behavioral questions
- Assess problem-solving skills
- Total interview duration: 20 minutes

CONTEXT:"""

        if self.resume:
            base_prompt += f"\n\nCandidate Resume:\n{self.resume}"

        if self.job_description:
            base_prompt += f"\n\nJob Description:\n{self.job_description}"

        return base_prompt

    async def generate_response(self, user_message: str) -> str:
        """
        Generate AI interviewer response based on candidate's message
        
        Args:
            user_message: What the candidate said
            
        Returns:
            AI interviewer's response
        """
        try:
            # Add user message to history
            self.conversation_history.append(
                {"role": "user", "content": user_message}
            )

            # Call GPT-4o
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    *self.conversation_history,
                ],
                max_tokens=150,
                temperature=0.7,
                top_p=0.9,
            )

            # Extract response
            assistant_message = response.choices[0].message.content

            # Add to history
            self.conversation_history.append(
                {"role": "assistant", "content": assistant_message}
            )

            return assistant_message

        except Exception as e:
            print(f"LLM error: {e}")
            return "I'm sorry, could you repeat that?"

    async def start_interview(self) -> str:
        """Generate opening question for the interview"""
        try:
            opening_prompt = (
                "Please start the interview by asking a warm-up question. "
                "Make it friendly and encouraging."
            )

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": opening_prompt},
                ],
                max_tokens=100,
                temperature=0.7,
            )

            opening_message = response.choices[0].message.content

            # Add to history
            self.conversation_history.append(
                {"role": "assistant", "content": opening_message}
            )

            return opening_message

        except Exception as e:
            print(f"LLM error: {e}")
            return "Hi! Thanks for joining this interview today. Tell me about yourself."

    def get_conversation_history(self) -> list:
        """Get the full conversation history"""
        return self.conversation_history

    def reset_conversation(self):
        """Reset conversation history"""
        self.conversation_history = []
