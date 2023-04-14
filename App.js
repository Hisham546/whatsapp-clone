
import React, { useEffect, useState } from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import Dashboard from './src/components/dashboard/dashboard';
import Settings from './src/components/profile/settings'
import Signup from './src/components/login/signup'
import Interface from './src/components/chatInterface/interface'
const Stack = createStackNavigator();


const App = () => {

  return (
        <NavigationContainer>
        <Stack.Navigator>
            <Stack.Screen
                options={{headerShown : false}}
                name="Signup"
                component={Signup}/>
            <Stack.Screen
                options={{headerShown : false}}
                name="Dashboard"
                component={Dashboard} />
            <Stack.Screen
                options={{headerShown : false}}
                name="Settings"
                component={Settings}/>
           <Stack.Screen
                  options={{headerShown : false}}
                  name="Interface"
                  component={Interface}/>
        </Stack.Navigator>

    </NavigationContainer>
);
}

export default App;