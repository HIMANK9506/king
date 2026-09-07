#ifndef SOUND_H
#define SOUND_H


#define BUZZER_PIN 25



void initSound()
{

pinMode(
BUZZER_PIN,
OUTPUT
);

}



void beep(
int duration
)

{

digitalWrite(
BUZZER_PIN,
HIGH
);


delay(duration);


digitalWrite(
BUZZER_PIN,
LOW
);


}



void happySound()
{

beep(100);

delay(50);

beep(150);

}



void feedSound()
{

beep(80);

}



#endif