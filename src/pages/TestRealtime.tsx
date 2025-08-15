import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/Layout';

export default function TestRealtime() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    console.log('Setting up test channel...');
    
    const channel = supabase
      .channel('test-channel')
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('Received broadcast:', payload);
        setMessages(prev => [...prev, payload]);
      })
      .subscribe((status) => {
        console.log('Channel status:', status);
        setStatus(status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('Cleaning up test channel');
      supabase.removeChannel(channel);
    };
  }, []);

  const sendTestMessage = async () => {
    const channel = supabase.channel('test-channel');
    const result = await channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { 
        message: 'Hello from test!', 
        timestamp: new Date().toISOString() 
      }
    });
    console.log('Send result:', result);
  };

  return (
    <Layout>
      <div className="container mx-auto p-8">
        <h1 className="text-2xl font-bold mb-4">Realtime Test</h1>
        
        <div className="space-y-4">
          <div>
            Status: <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
              {status}
            </span>
          </div>
          
          <Button onClick={sendTestMessage}>
            Send Test Message
          </Button>
          
          <div className="border p-4 rounded">
            <h2 className="font-bold mb-2">Messages:</h2>
            {messages.map((msg, i) => (
              <div key={i} className="text-sm">
                {JSON.stringify(msg)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}