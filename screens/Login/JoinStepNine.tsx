import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useLayoutEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "react-query";
import { Category, UserApi, CategoryResponse } from "../../api";
import { useToast } from "react-native-toast-notifications";
import { useDispatch, useSelector } from "react-redux";
import CustomText from "../../components/CustomText";
import CustomTextInput from "../../components/CustomTextInput";
import styled from "styled-components/native";

const Container = styled.View`
  width: 100%;
  height: 95%;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  padding-horizontal: 20px;
  padding-top: 30px;
`;

const Wrap = styled.View`
  width: 100%;
`;

const BorderWrap = styled.View`
  width: 100%;
  height: 2px;
  background-color: #d0d0d0;
`;

const Border = styled.View`
  width: 90%;
  height: 2px;
  background-color: #295af5;
`;

const AskText = styled.Text`
  color: #000000;
  font-size: 20px;
  font-weight: bold;
  margin-top: 24px;
`;

const SubText = styled.Text`
  color: #a0a0a0;
  font-size: 12px;
  margin-top: 7px;
`;

const Button = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 48px;
  background-color: ${(props) => (props.disabled ? "#d3d3d3" : "#295AF5")};
`;

const ButtonTitle = styled.Text`
  color: #fff;
  font-size: 18px;
  font-weight: 700;
`;

const CategoryWrap = styled.View`
  margin-top: 20px;
`;

const CategoryText = styled(CustomText)<{ selected?: boolean }>`
  font-size: 14px;
  line-height: 21px;
  text-align: center;
  color: ${(props) => (props.selected ? "white" : "black")};
`;

const CategoryView = styled.View`
  flex-direction: row;
  justify-content: flex-start;
  margin: 10px 0px;
`;
const CategoryLabel = styled.TouchableOpacity<{ selected?: boolean }>`
  justify-content: center;
  align-items: center;
  padding: 3px 5px;
  border-radius: 20px;
  border: 1px solid #d7d7d7;
  background-color: ${(props) => (props.selected ? "#295AF5" : "white")};
  margin: 0px 5px;
`;

const JoinStepNine: React.FC<NativeStackScreenProps<any, "AuthStack">> = ({ navigation: { navigate }, route: { params: name, email, password, sex, birth, phone, church, category } }) => {
  const token = useSelector((state) => state.AuthReducers.authToken);
  const toast = useToast();

  const [userName, setUserName] = useState(name);
  const [userEmail, setUserEmail] = useState(email);
  const [userPw, setUserPw] = useState(password);
  const [approvalMethod, setApprovalMethod] = useState(sex);
  const [birthNumber, setBirthNumber] = useState(birth);
  const [phoneNumber, setPhoneNumber] = useState(phone);
  const [churchName, setChurchName] = useState(church);

  useEffect(() => {
    const getData = async () => {
      try {
        // AsyncStorage에서 inputData에 저장된 값 가져오기
        const value = await AsyncStorage.getItem("userInfo");
        // value에 값이 있으면 콘솔에 찍어줘
        if (value !== null) {
          console.log(value);
        }
      } catch (error) {
        console.log(error);
      }
    };
    // 함수 실행
    getData();
  }, []);

  const storeData = async () => {
    try {
      await AsyncStorage.setItem(
        "userInfo",
        JSON.stringify({
          name: userName.name,
          email: userName.email,
          password: userName.password,
          sex: userName.sex,
          birth: userName.birth,
          phone: userName.phone,
          church: userName.church,
          category: "",
        }),
        () => {
          console.log("유저정보 저장 완료");
        }
      );
      console.log("등록 완료");
    } catch (error) {
      console.log(error);
    }
  };
  
  const goToNext = () => {
    storeData();
    navigate("LoginStack", {
      screen: "JoinConfirm",
      name: userName.name,
      email: userName.email,
      password: userName.password,
      sex: userName.sex,
      birth: userName.birth,
      phone: userName.phone,
      church: userName.church,
      category: "",
    });
  };

  return (
    <Container>
      <Wrap>
        <BorderWrap>
          <Border></Border>
        </BorderWrap>
        <AskText>관심있는 카테고리를 3개 이상 선택해주세요.</AskText>
        <SubText>모임 추천에 반영됩니다.</SubText>
        {/* {categoiresLoading ? (
          <></>
        ) : (
          <CategoryWrap>
            {categoryBundle?.map((bundle, index) => (
              <CategoryView key={index}>
                {bundle?.map((categories, index) => (
                  <CategoryLabel key={index} onPress={() => onPressCategory(categories.id)} selected={selectCategory1 === categories.id || selectCategory2 === categories.id}>
                    <CategoryText selected={selectCategory1 === categories.id || selectCategory2 === categories.id}>{`${categories.thumbnail} ${categories.name}`}</CategoryText>
                  </CategoryLabel>
                ))}
              </CategoryView>
            ))}
          </CategoryWrap>
        )} */}
      </Wrap>
      <Wrap>
        <Button onPress={goToNext}>
          <ButtonTitle>다음</ButtonTitle>
        </Button>
      </Wrap>
    </Container>
  );
};

export default JoinStepNine;