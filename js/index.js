// required dom elements
const buttonEl = document.getElementById('button');
const messageEl = document.getElementById('message');
const titleEl = document.getElementById('real-time-title');

// initial states and global variables
messageEl.style.display = 'none';
let isRecording = false; //recorder state
let socket; //web socket
let recorder; 

const run = async () => {

    isRecording = !isRecording; //change initial recording state from false to true
    buttonEl.innerText = isRecording ? 'Stop' : 'Record'; //change start button to recording button
    //if isRecording is true, innertext = 'Click stop to end..', else inner text = 'click start...'
    titleEl.innerText = isRecording ? 'Click stop to end recording!' : 'Click start to begin recording!'
    //if recording is stopped (went from true back to inital state of flase), do this
    if (!isRecording) { 
  
      if (recorder) {
        recorder.pauseRecording();
        recorder = null;
      }
      
      //if the socket is open (true?), send terminate message and close it
      if (socket) {
        socket.send(JSON.stringify({terminate_session: true}));
        socket.close();
        socket = null;
      }
  
    } 
    //conditions for this else: recorder is running (is recording is true)
    else {
      // TODO: setup websocket and handle events

      // get session token from backend
        const response = await fetch('http://localhost:8000');
        const data = await response.json();

        if(data.error){
            alert(data.error)
        }
            
        const { token } = data;

        // establish wss with AssemblyAI at 16000 sample rate
        socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`);

        // handle incoming messages to display transcription to the DOM
        const texts = {};
        socket.onmessage = (message) => {
            let msg = '';
            const res = JSON.parse(message.data);
            texts[res.audio_start] = res.text;
            const keys = Object.keys(texts);
            keys.sort((a, b) => a - b);
            for (const key of keys) {
                if (texts[key]) {
                    msg += ` ${texts[key]}`;
                }
            }
            messageEl.innerText = msg;
        };

        // handle error
        socket.onerror = (event) => {
            console.error(event);
            socket.close();
        }
            
        // handle socket close
        socket.onclose = event => {
            console.log(event);
            socket = null;
        }

        // handle socket open
        socket.onopen = () => {
            // begin recording
            messageEl.style.display = '';
            navigator.mediaDevices.getUserMedia({ audio: true })
            .then((stream) => {
                recorder = new RecordRTC(stream, {
                type: 'audio',
                mimeType: 'audio/webm;codecs=pcm', // endpoint requires 16bit PCM audio
                recorderType: StereoAudioRecorder,
                timeSlice: 250, // set 250 ms intervals of data
                desiredSampRate: 16000,
                numberOfAudioChannels: 1, // real-time requires only one channel
                bufferSize: 4096,
                audioBitsPerSecond: 128000,
                ondataavailable: (blob) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64data = reader.result;

                        // audio data must be sent as a base64 encoded string
                        if (socket) {
                            socket.send(JSON.stringify({ audio_data: base64data.split('base64,')[1] }));
                        }
                    };
                    reader.readAsDataURL(blob);
                },
            });

            recorder.startRecording();
            })
            .catch((err) => console.error(err));
        };
            }
        };
  

  buttonEl.addEventListener('click', () => run()); 
//this is the start button

//   buttonEl.addEventListener('click', () => console.log('clicked')); //this is the start button