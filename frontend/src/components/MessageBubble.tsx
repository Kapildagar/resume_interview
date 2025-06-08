
import React from 'react';
import { User, Bot, Mic } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  isAudio?: boolean;
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLast }) => {
  const isUser = message.type === 'user';
  
  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
      style={{
        animationDelay: isLast ? '0ms' : '0ms',
        animationDuration: '400ms'
      }}
    >
      <div className={`flex items-start space-x-3 max-w-md ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
            : 'bg-gradient-to-br from-green-500 to-teal-600'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
        
        {/* Message Content */}
        <div className={`relative group ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
          <div 
            className={`px-4 py-3 rounded-2xl max-w-sm break-words shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md ${
              isUser
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-br-md'
                : 'bg-white/80 text-gray-800 rounded-bl-md border border-white/20'
            }`}
          >
            {message.isAudio && (
              <div className="flex items-center space-x-2 mb-2">
                <Mic className="w-3 h-3 opacity-70" />
                <span className="text-xs opacity-70">Audio message</span>
              </div>
            )}
            
            <p className="text-sm leading-relaxed">
              {message.isAudio ? "🎵 Audio message sent" : message.content}
            </p>
          </div>
          
          {/* Timestamp */}
          <div className={`mt-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
