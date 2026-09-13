export const DEMO_CONTEXT = { title:'OffRecord · Launch planning', domain:'Sample meeting', heading:'Browser agent hackathon · product sync' };
export const DEMO = [
  {text:'Maya: Our browser meeting agent needs a clear demo. Today we need to settle scope, owners, and the open risks.'},
  {text:'Luis: We decided to keep all audio and transcripts on the device. No cloud AI service in the meeting flow.',kind:'decisions',note:'Keep meeting audio and transcripts on the device.'},
  {text:'Maya: Agreed. We will ship a Chrome extension with a side panel for the hackathon.',kind:'decisions',note:'Ship a Chrome extension with a meeting side panel.'},
  {text:'Luis: I will test the tab audio capture by Friday.',kind:'actions',note:'Test tab audio capture.',owner:'Luis',due:'Friday'},
  {text:'Maya: I will record the two-minute demo tomorrow.',kind:'actions',note:'Record the two-minute demo.',owner:'Maya',due:'Tomorrow'},
  {text:'Sam: Can the model keep up on a laptop without a powerful GPU? We still need to measure that.',kind:'questions',note:'Can local inference keep up on a laptop with a modest GPU?'},
  {text:'Luis: Someone needs to verify the offline model cache before the presentation.',kind:'actions',note:'Verify the offline model cache before the presentation.'},
  {text:'Maya: Then the plan is set. We should review the transcript evidence before sharing any notes.'},
];
