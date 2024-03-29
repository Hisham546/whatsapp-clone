import React, { useEffect, useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet, TouchableOpacity, TextInput, Keyboard,
}
  from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen'
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/Octicons';
import auth from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import PhoneInput from "react-native-phone-number-input";
import Toast from "react-native-simple-toast";
import database from '@react-native-firebase/database';
import { addingPhoneNumber } from "../../state/chatReducer";
import { useDispatch } from 'react-redux';
import { PacmanIndicator } from 'react-native-indicators';
import { CommonActions } from '@react-navigation/native';
import { BSON } from 'realm';
import { Profile } from '../../models/realmModels';
import { useRealm } from '@realm/react';
import { MMKV } from 'react-native-mmkv'
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { storeUserData } from '../../state/actions';
import { storeUserSessionToMMKV, getUserSessionFromMMKV, getNumberFromMMKV } from '../../data/mmkvStorage';
import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid } from 'react-native';
import { storeUserIdMMKV } from '../../data/mmkvStorage';
import { storeFCMToMMKV } from '../../data/mmkvStorage';
import { LoadUserData } from '../../operations/loadUserDetails';
export default function Signup({ navigation }) {




  const [userName, setUserName] = useState();
  const phoneInput = useRef(null);
  const [country, setCountry] = useState(['91']);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const realm = useRealm();
  const dispatch = useDispatch();

  useEffect(() => {
    const checkUserSession = async () => {
      const isUserSessionSaved = await getUserSessionFromMMKV();
      const phoneNumber = await getNumberFromMMKV()
      const userData = await LoadUserData(phoneNumber)
      dispatch(storeUserData(userData))
      if (isUserSessionSaved) {

        navigation.navigate('Dashboard');
      }
    };

    checkUserSession();
    requestUserPermission();
  }, []);



  async function requestUserPermission() {
    try {
      // Request permission for notifications (Android)
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATION
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        // Permission granted, proceed to request permission for Firebase messaging
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          getFCMToken()
          // console.log('Authorization status:', authStatus);
        } else {
          //   console.log('Permission for Firebase messaging not granted.');
        }
      } else {
        // console.log('Permission for notifications (Android) not granted.');
      }
    } catch (error) {
      console.error('Error occurred while requesting permission:', error);
    }
  }
  const getFCMToken = async () => {
    try {
      const token = await messaging().getToken();
      storeFCMToMMKV(token)
      console.log('FCM token:', token);
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  };


  async function signInWithPhoneNumber(number) {

    // storeUserDetailsRealm(number)
    storeUserSessionToMMKV(number)
    try {
      const confirmation = await auth().signInWithPhoneNumber(number);

      if (confirmation.state != "error") {
        setLoading(false);

        removeLogin()


        navigation.navigate('Otp', { confirm: confirmation });


      }
    } catch (error) {
      if (error.code == 'auth/too-many-requests') {
        Toast.show('Too-many-requests', Toast.SHORT);
        // console.log('auth/too-many-requests', error);
        setLoading(false);
      } else if (error.code === 'auth/user-disabled') {
        setLoading(false);
        Toast.show('Sorry, this phone number has been blocked.', Toast.SHORT)
        //  console.log('auth/user-disabled', error);
      } else {
        setLoading(false);
        //console.log(error)
        Toast.show('Sorry, we couldn\'t verify that phone number at the moment. '
          + 'Please try again later. '
          + '\n\nIf the issue persists, please contact support.', Toast.SHORT);
        //  console.log(error);
      }
    }
  };
  const checkingUser = async (phoneNumber) => {

    var ref = database().ref("userdetails");
    const snapshot = await ref.orderByChild("phoneNumber").equalTo(phoneNumber).once("value");
    const userData = snapshot.val();
    if (userData) {

      const senderId = Object.values(userData)[0].senderId;
      await storeUserIdMMKV(senderId)

    } else {
      // User not found
      return null;
    }
    if (snapshot.exists()) {
      return true;
    } else {
      return false;
    }
  }




  const onNext = async () => {
    setLoading(true);
    if (await checkingUser(phoneNumber) === true) {
      await storeUserSessionToMMKV(phoneNumber);
      dispatch(storeUserName(userName)); // Dispatching userName from state
      setPhoneNumber('');
      setUserName('');
      setLoading(false);
      navigation.navigate('Dashboard');
    } else {
      if (phoneNumber === '') {
        Toast.show("Enter your phone number ", Toast.SHORT);
        setLoading(false);
      } else if (userName === '') {
        Toast.show("Enter your user name ", Toast.SHORT);
        setLoading(false);
      } else {
        saveToDatabase(userName);
        Keyboard.dismiss();
        setLoading(true);

        dispatch(addingPhoneNumber(phoneNumber));
        signInWithPhoneNumber('+' + country + phoneNumber);
      }
    }
  };

  const removeLogin = () => {
    navigation.dispatch(state => {
      const routes = state.routes.filter(r => r.name !== 'Otp');
      return CommonActions.reset({
        ...state,
        routes,
        index: routes.length - 1,
      });
    });
  };
  ;


  const storeUserDetailsRealm = (number) => {


    realm.write(() => {
      realm.create(Profile, {
        _id: new BSON.ObjectId(),
        username: number,
      });
    });
  };



  const saveToDatabase = (username) => {
    dispatch(storeUserName(username))
    var data = {
      username,
      phoneNumber,
      logintime: new Date().toUTCString()
    };
    // Send the data to the database
    var ref = database().ref("userdetails");
    ref.push(data);

  }
  // //need some changes here
  // const checkTextLength = (username) => {

  //   setUserName(username)
  //   if (username != '') {
  //     if (phoneNumber.length === 10) {

  //     }
  //   }
  //   else {
  //     //   Toast.show('Enter 6 digits.',Toast.SHORT)

  //   }

  // }
  return (
    <View style={styles.container}>
      <View style={styles.upperView}>
        <MaterialIcon name={'whatsapp'} size={hp('7%')} color={'white'} />
        <Text style={{ color: 'white', fontSize: hp('3'), fontFamily: 'Manrope-Bold', marginTop: hp('2') }}> WhatsApp</Text>
      </View>
      <View style={styles.secondView}>
        <Text style={{ color: 'black', fontSize: hp('1.80'), fontFamily: 'Manrope-Regular' }}> Enter your mobile number to login or register</Text>


        <TextInput
          // onFocus={() => onFocus("Name")}
          style={[styles.input, {
            // borderBottomWidth: focusControl == "Name" ? 1 : 0.2,
            // borderBottomColor: focusControl == "Name" ? 'gray' : 'black'
          }]}
          onChangeText={(value) => setUserName(value)}
          value={userName}
          placeholderTextColor={'gray'}
          placeholder={"Enter your username"}
        />
        <PhoneInput
          ref={phoneInput}
          defaultValue={phoneNumber}
          defaultCode="IN"
          layout="first"
          codeTextStyle={{ fontSize: hp('1.75%'), fontWeight: '500', paddingBottom: hp('0.2%') }}
          textInputStyle={{ fontSize: hp('1.75%'), fontWeight: '400', }}
          placeholder="Enter Phone Number"
          placeholderTextColor={'gray'}

          countryPickerProps={{ withAlphaFilter: true }}
          containerStyle={styles.phoneNumberView}
          onChangeText={text => {
            setPhoneNumber(text);
          }}
          onChangeCountry={text => {
            setCountry(text.callingCode.join(','));
          }}
          textContainerStyle={{ paddingVertical: 0 }}
        />

        <TouchableOpacity style={styles.roundButton} onPress={() => onNext()}>
          {loading === true ?
            <PacmanIndicator color='#fff' size={26} />
            :
            <Text style={{ color: 'white', fontSize: hp('2.20'), letterSpacing: wp('.25'), fontFamily: 'Manrope-Bold' }}> SIGN UP</Text>
          }
        </TouchableOpacity>

      </View>
    </View>

  )

}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: 'white',

  },
  secondView: {
    width: wp('100%'),
    height: hp('60%'),
    backgroundColor: 'white',
    justifyContent: 'space-evenly',
    alignItems: 'center',

  },
  upperView: {
    width: wp('100'),
    height: hp('40'),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#128C7E',

  },
  submitButton: {
    height: hp(6),
    width: wp('68'),
    color: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 20,
  },
  submitText: {
    fontSize: hp('1.70%'),
    color: 'white',
    letterSpacing: wp('.10%'),
  },
  googleText: {
    fontSize: hp('1.70%'),
    color: 'black',
    letterSpacing: wp('.10%'),
  },
  googleButton: {
    height: hp(6),
    width: wp(68),
    backgroundColor: 'white',
    flexDirection: 'row',
    color: 'white',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'black',
  },

  backIcon: {
    marginLeft: wp('4')
  },
  input: {
    width: wp('80%'),
    height: hp('7'),
    borderRadius: 3,
    borderWidth: wp('.4'),
    borderColor: '#128C7E',
    color: 'black'
  },
  phoneNumberView: {
    marginTop: hp(1),
    justifyContent: 'center',
    width: wp('80%'),
    height: hp('7%'),
    borderRadius: 5,
    borderWidth: wp('.4'),
    borderColor: '#128C7E',

  },
  headingText: {
    fontSize: hp('1.50%'),
    color: 'white',
    letterSpacing: wp('.10%'),
    marginLeft: wp('6')

  },
  headingTextView: {
    width: wp('90'),
    height: hp('5'),
    justifyContent: 'center',
    marginTop: hp('3')

  },
  roundButton: {
    width: wp('80'),
    height: hp('6.5'),
    borderRadius: 19,
    flexDirection: 'row',
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3

  }
})
