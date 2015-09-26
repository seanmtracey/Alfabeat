// 1 : Kickdrum; 2 : Floor Tom; 3 : Crash;
int sensorPins[] = {A0, A1, A2, A3, A4, A5, 5};
int numberOfSensors = 4;

int values[sizeof(sensorPins)];

void setup(){
  
  Serial.begin(115200);
  Serial.flush();
  
  /*for(int x = 0; x < sizeof(sensorPins); x += 1){
     pinMode(sensorPins[x], INPUT);
  }*/
  
  pinMode(A0, INPUT);
  pinMode(A1, INPUT);
  pinMode(A2, INPUT);
  pinMode(A3, INPUT);
  pinMode(A4, INPUT);
  pinMode(A5, INPUT);
//  pinMode(5, INPUT);
  
}

void loop(){
 
 //Serial.println(analogRead(shoePin));   
 
 for(int y = 0; y < numberOfSensors; y += 1){
   
     Serial.print(analogRead(sensorPins[y]));
   
   Serial.print(" ");
 }
  
  Serial.println();
  
}
