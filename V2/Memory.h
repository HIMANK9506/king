#ifndef MEMORY_H
#define MEMORY_H


#include <Arduino.h>
#include <Preferences.h>

#include "Config.h"


Preferences memory;



void initMemory()
{

memory.begin(
MEMORY_NAMESPACE,
false
);

}



void saveMemory()
{

memory.putInt(
"happiness",
happiness
);


memory.putInt(
"hunger",
hunger
);


memory.putInt(
"energy",
energy
);


memory.putInt(
"friendship",
friendship
);


memory.putInt(
"curiosity",
curiosity
);

}



void loadMemory()
{


happiness =
memory.getInt(
"happiness",
DEFAULT_HAPPINESS
);



hunger =
memory.getInt(
"hunger",
DEFAULT_HUNGER
);



energy =
memory.getInt(
"energy",
DEFAULT_ENERGY
);



friendship =
memory.getInt(
"friendship",
DEFAULT_FRIENDSHIP
);



curiosity =
memory.getInt(
"curiosity",
DEFAULT_CURIOSITY
);


}


#endif