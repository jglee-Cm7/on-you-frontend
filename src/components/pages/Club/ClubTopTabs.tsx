import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { ActivityIndicator, Alert, Animated, BackHandler, DeviceEventEmitter, Keyboard, KeyboardAvoidingView, LayoutChangeEvent, Platform, StatusBar, useWindowDimensions } from "react-native";
import ClubHome from "./ClubHome";
import ClubFeed from "./ClubFeed";
import styled from "styled-components/native";
import ClubHeader from "@components/organisms/ClubHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FloatingActionButton from "@components/atoms/FloatingActionButton";
import { useMutation, useQuery } from "react-query";
import {
  BaseResponse,
  ClubApi,
  ClubDeletionRequest,
  ClubResponse,
  ClubRoleResponse,
  ClubSchedulesResponse,
  ClubWithdrawRequest,
  ErrorResponse,
  GuestCommentRequest,
  NotificationsResponse,
  RefinedSchedule,
} from "api";
import { useSelector } from "react-redux";
import { useToast } from "react-native-toast-notifications";
import moment from "moment-timezone";
import { RootState } from "redux/store/reducers";
import { useAppDispatch } from "redux/store";
import clubSlice from "redux/slices/club";
import Share from "react-native-share";
import dynamicLinks from "@react-native-firebase/dynamic-links";
import CircleIcon from "@components/atoms/CircleIcon";
import ClubOptionModal from "./ClubOptionModal";
import { useModalize } from "react-native-modalize";
import TabBar from "@components/atoms/TabBar";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ClubStackParamList } from "@navigation/ClubStack";
import { selectClubEvent, ClubEventParams } from "app/analytics";

const Container = styled.View`
  flex: 1;
`;

const FooterView = styled.View`
  background-color: white;
  height: 80px;
`;

const CommentInputView = styled.View`
  flex-direction: row;
  border-top-width: 0.5px;
  border-top-color: #c4c4c4;
  align-items: flex-end;
  padding: 20px 20px 0px 20px;
  margin-bottom: 10px;
`;

const RoundingView = styled.View`
  flex-direction: row;
  flex: 1;
  height: 100%;
  /* border-width: 0.5px;
  border-color: rgba(0, 0, 0, 0.5);
  border-radius: 15px; */
  padding: 3px 10px;
`;
const CommentInput = styled.TextInput`
  font-family: ${(props) => props.theme.koreanFontR};
  font-size: 12px;
  flex: 1;
  margin: 1px 0px;
`;
const SubmitButton = styled.TouchableOpacity`
  width: 40px;
  justify-content: center;
  align-items: center;
  padding-left: 8px;
  margin-bottom: 8px;
`;
const SubmitLoadingView = styled.View`
  width: 40px;
  justify-content: center;
  align-items: center;
  padding-left: 8px;
  margin-bottom: 8px;
`;
const SubmitButtonText = styled.Text<{ disabled: boolean }>`
  font-family: ${(props) => props.theme.koreanFontM};
  font-size: 14px;
  line-height: 20px;
  color: #63abff;
  opacity: ${(props) => (props.disabled ? 0.3 : 1)};
`;

const TopTab = createMaterialTopTabNavigator();

const HEADER_EXPANDED_HEIGHT = 300;
const HEADER_HEIGHT = 56;
const TAB_BUTTON_HEIGHT = 46;
const ACTION_BUTTON_HEIGHT = 80;

const AnimatedFooterView = Animated.createAnimatedComponent(FooterView);

const ClubTopTabs: React.FC<NativeStackScreenProps<ClubStackParamList, "ClubTopTabs">> = ({
  route: {
    params: { clubId, isNew },
  },
  navigation: { navigate, goBack, popToTop, push },
}) => {
  const me = useSelector((state: RootState) => state.auth.user);
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [scheduleData, setScheduleData] = useState<RefinedSchedule[]>();
  const [notiCount, setNotiCount] = useState<number>(0);
  const { ref: clubOptionRef, open: openClubOption, close: closeClubOption } = useModalize();
  const modalOptionButtonHeight = 45;

  // Header Height Definition
  const { top, bottom } = useSafeAreaInsets();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const headerConfig = useMemo(
    () => ({
      heightCollapsed: top + HEADER_HEIGHT,
      heightExpanded: HEADER_EXPANDED_HEIGHT,
    }),
    [top, HEADER_HEIGHT, HEADER_EXPANDED_HEIGHT]
  );
  const { heightCollapsed, heightExpanded } = headerConfig;
  const headerDiff = heightExpanded - heightCollapsed;

  // API Calling
  const withdrawClubMutation = useMutation<BaseResponse, ErrorResponse, ClubWithdrawRequest>(ClubApi.withdrawClub, {
    onSuccess: (res) => {
      toast.show(`모임에서 탈퇴하셨습니다.`, { type: "success" });
      DeviceEventEmitter.emit("ClubRefetch");
    },
    onError: (error) => {
      console.log(`API ERROR | withdrawClub ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const deleteClubMutation = useMutation<BaseResponse, ErrorResponse, ClubDeletionRequest>(ClubApi.deleteClub, {
    onSuccess: (res) => {
      toast.show(`모임이 삭제되었습니다.`, { type: "success" });
      DeviceEventEmitter.emit("ClubListRefetch");
      popToTop();
    },
    onError: (error) => {
      console.log(`API ERROR | deleteClub ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const {
    data: clubData,
    isLoading: clubLoading,
    refetch: clubDataRefetch,
  } = useQuery<ClubResponse, ErrorResponse>(["getClub", clubId], ClubApi.getClub, {
    onSuccess: (res) => {},
    onError: (error) => {
      console.log(`API ERROR | getClub ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
    staleTime: 10000,
    cacheTime: 15000,
  });

  const {
    isLoading: clubRoleLoading,
    data: clubRole,
    refetch: clubRoleRefetch,
  } = useQuery<ClubRoleResponse, ErrorResponse>(["getClubRole", clubId], ClubApi.getClubRole, {
    onSuccess: (res) => {
      dispatch(clubSlice.actions.updateClubRole({ clubId, role: res.data.role, applyStatus: res.data.applyStatus }));
    },
    onError: (error) => {
      console.log(`API ERROR | getClubRole ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const { isLoading: schedulesLoading, refetch: schedulesRefetch } = useQuery<ClubSchedulesResponse, ErrorResponse>(["getClubSchedules", clubId], ClubApi.getClubSchedules, {
    onSuccess: (res) => {
      const week = ["일", "월", "화", "수", "목", "금", "토"];
      const result: RefinedSchedule[] = [];
      for (let i = 0; i < res?.data?.length; ++i) {
        const date = moment(res.data[i].startDate).tz("Asia/Seoul");
        const dayOfWeek = week[date.day()];
        const refined: RefinedSchedule = {
          id: res.data[i].id,
          location: res.data[i].location,
          name: res.data[i].name,
          members: res.data[i].members,
          startDate: res.data[i].startDate,
          endDate: res.data[i].endDate,
          content: res.data[i].content,
          year: date.format("YYYY"),
          month: date.format("MM"),
          day: date.format("DD"),
          hour: date.format("h"),
          minute: date.format("m"),
          ampm: date.format("A"),
          dayOfWeek: dayOfWeek,
          participation: res.data[i].members?.map((member) => member.id).includes(me?.id),
          isEnd: false,
        };
        result.push(refined);
      }
      result.push({ isEnd: true });
      setScheduleData(result);
    },
    onError: (error) => {
      console.log(`API ERROR | getClubSchedules ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const { isLoading: notiLoading, refetch: clubNotiRefetch } = useQuery<NotificationsResponse, ErrorResponse>(["getClubNotifications", clubId], ClubApi.getClubNotifications, {
    onSuccess: (res) => {
      setNotiCount(res?.data.filter((item) => !item.read).length);
    },
    onError: (error) => {
      console.log(`API ERROR | getClubNotifications ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  // Animated Variables
  const screenScrollRefs = useRef<any>({});
  const screenScrollOffset = useRef<any>({});
  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = scrollY.interpolate({
    inputRange: [0, headerDiff],
    outputRange: [0, -headerDiff],
    extrapolate: "clamp",
  });

  // guestbook keyboard
  const guestCommentInputRef = useRef(null);
  const [commentInputHeight, setCommentInputHeight] = useState<number>(0);
  const [validation, setValidation] = useState<boolean>(false);
  const [guestComment, setGuestComment] = useState<string>("");
  const guestCommentOpacity = useRef(new Animated.Value(0)).current;
  const [gusetCommentZIndex, setGuestCommentZIndex] = useState<number>(0);

  const guestCommentMutation = useMutation<BaseResponse, ErrorResponse, GuestCommentRequest>(ClubApi.createGuestComment, {
    onSuccess: (res) => {
      setGuestComment("");
      setValidation(false);
      DeviceEventEmitter.emit("GuestCommentRefetch");
      Keyboard.dismiss();
    },
    onError: (error) => {
      console.log(`API ERROR | createGuestComment ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const guestCommentSubmit = () => {
    if (!validation) return toast.show(`글을 입력하세요.`, { type: "warning" });

    const requestData: GuestCommentRequest = {
      clubId,
      content: guestComment.trim(),
    };

    guestCommentMutation.mutate(requestData);
  };

  // Screen Scroll Sync
  const syncScrollOffset = (screenName: string) => {
    screenScrollOffset.current[screenName] = scrollY._value; // 현재 탭의 y 값 저장.

    // 다른 탭들의 scroll 위치 조절
    for (const [key, ref] of Object.entries(screenScrollRefs.current)) {
      if (key === screenName) continue;
      const offsetY = screenScrollOffset.current[key] ?? 0;

      // 현재 탭의 y 값과 헤더가 접히는 정도를 기준으로 다른 탭들의 스크롤 위치를 변경한다.
      if (scrollY._value < headerDiff) {
        if (ref.scrollTo) {
          ref.scrollTo({
            x: 0,
            y: scrollY._value,
            animated: false,
          });
        } else {
          ref.scrollToOffset({
            offset: scrollY._value,
            animated: false,
          });
        }
        screenScrollOffset.current[key] = scrollY._value;
      } else if (scrollY._value >= headerDiff && offsetY < headerDiff) {
        if (ref.scrollTo) {
          ref.scrollTo({
            x: 0,
            y: headerDiff,
            animated: false,
          });
        } else {
          ref.scrollToOffset({
            offset: headerDiff,
            animated: false,
          });
        }
        screenScrollOffset.current[key] = headerDiff;
      }
    }
  };

  // Function in Modal
  const goToClubEdit = () => {
    closeClubOption();
    push("ClubManagementStack", { screen: "ClubManagementMain", params: { clubId } });
  };

  const goToClubJoin = () => {
    if (clubRole?.data?.applyStatus === "APPLIED") {
      return toast.show("가입신청서가 이미 전달되었습니다.", { type: "warning" });
    }
    if (clubData?.data?.recruitStatus === "CLOSE") {
      return toast.show("멤버 모집 기간이 아닙니다.", { type: "warning" });
    }

    push("ClubJoin", { clubId, clubName: clubData?.data.name });
  };

  const goToFeedCreation = () => {
    if (me === undefined) {
      toast.show("유저 정보를 알 수 없습니다.", { type: "warning" });
      return;
    }
    push("FeedStack", { screen: "ImageSelection", params: { clubData: { id: clubId } } });
  };

  const openShare = async () => {
    closeClubOption();
    const link = await dynamicLinks().buildShortLink(
      {
        link: `https://onyou.page.link/club?id=${clubId}`,
        domainUriPrefix: "https://onyou.page.link",
        android: { packageName: "com.onyoufrontend" },
        ios: { bundleId: "com.onyou.project", appStoreId: "1663717005" },
        otherPlatform: { fallbackUrl: "https://thin-helium-f6d.notion.site/e33250ceb44c428cb881d6ac7d163e69" },
        social: {
          title: clubData?.data?.name ?? "",
          descriptionText: clubData?.data?.clubShortDesc ?? "",
          imageUrl: clubData?.data?.thumbnail ?? "",
        },

        // navigation: { forcedRedirectEnabled: true }, // iOS에서 preview page를 스킵하는 옵션. 이걸 사용하면 온유앱이 꺼져있을 때는 제대로 navigation이 되질 않는 버그가 있음.
      },
      dynamicLinks.ShortLinkType.SHORT
    );
    const title = clubData?.data.name;
    const options = Platform.select({
      default: {
        title,
        subject: title,
        message: `${link}`,
      },
    });
    try {
      await Share.open(options);
    } catch (e) {}
  };

  const openShareJoin = () => {
    closeClubOption();
  };

  const goToReportClub = () => {
    closeClubOption();
  };

  const openClubOptionModal = () => {
    openClubOption();
  };

  const withdrawClub = () => {
    const requestData = { clubId };
    Alert.alert("모임 탈퇴", "정말로 모임에서 탈퇴하시겠습니까?", [
      { text: "아니요" },
      {
        text: "예",
        onPress: () => {
          if (clubData?.data?.members?.length === 1 && clubData?.data?.members[0].id === me?.id && clubData?.data?.members[0].role === "MASTER")
            Alert.alert("모임 삭제 안내", "현재 모임의 리더입니다. 모임을 탈퇴할 시 이 모임은 삭제됩니다. 삭제하시겠습니까?", [
              { text: "아니요" },
              {
                text: "예",
                onPress: () => {
                  deleteClubMutation.mutate(requestData);
                },
              },
            ]);
          else withdrawClubMutation.mutate(requestData);
        },
      },
    ]);
  };

  useEffect(() => {
    if (clubData?.data) selectClubEvent(clubData?.data);
  }, [clubData]);

  useEffect(() => {
    dispatch(clubSlice.actions.initClub({ clubId }));

    const scrollListener = scrollY.addListener(({ value }) => {});

    const scheduleSubscription = DeviceEventEmitter.addListener("SchedulesRefetch", () => {
      schedulesRefetch();
    });
    const clubSubscription = DeviceEventEmitter.addListener("ClubRefetch", () => {
      clubDataRefetch();
      clubRoleRefetch();
      clubNotiRefetch();
    });

    const guestCommentSubscription = DeviceEventEmitter.addListener("ClubGuestCommentFocus", () => {
      guestCommentInputRef?.current?.focus();
    });

    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setGuestCommentZIndex(3);
      Animated.timing(guestCommentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide", () => {
      Animated.timing(guestCommentOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => setGuestCommentZIndex(0));
    });
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isNew) popToTop();
      else goBack();
      return true;
    });

    return () => {
      scrollY.removeListener(scrollListener);
      scheduleSubscription.remove();
      clubSubscription.remove();
      guestCommentSubscription.remove();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      backHandler.remove();
      dispatch(clubSlice.actions.initClub({ clubId }));
    };
  }, []);

  const renderClubHome = useCallback(
    (props) => (
      <ClubHome
        {...props}
        clubData={clubData?.data}
        scrollY={scrollY}
        headerDiff={headerDiff}
        headerCollapsedHeight={heightCollapsed}
        actionButtonHeight={ACTION_BUTTON_HEIGHT}
        schedules={scheduleData}
        syncScrollOffset={syncScrollOffset}
        screenScrollRefs={screenScrollRefs}
        screenScrollOffset={screenScrollOffset}
      />
    ),
    [headerDiff, clubData, scheduleData]
  );

  const renderClubFeed = useCallback(
    (props) => (
      <ClubFeed
        {...props}
        scrollY={scrollY}
        headerDiff={headerDiff}
        headerCollapsedHeight={heightCollapsed}
        actionButtonHeight={ACTION_BUTTON_HEIGHT}
        syncScrollOffset={syncScrollOffset}
        screenScrollRefs={screenScrollRefs}
        screenScrollOffset={screenScrollOffset}
      />
    ),
    [headerDiff, clubId]
  );

  return (
    <Container>
      <StatusBar translucent backgroundColor={"transparent"} barStyle={"dark-content"} />
      <ClubHeader
        clubId={clubId}
        clubRole={clubRole?.data}
        notiCount={notiCount}
        openClubOptionModal={openClubOptionModal}
        headerHeight={HEADER_HEIGHT}
        heightExpanded={heightExpanded}
        heightCollapsed={heightCollapsed}
        headerDiff={headerDiff}
        scrollY={scrollY}
        isNew={isNew}
      />

      <Animated.View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          zIndex: 2,
          flex: 1,
          width: "100%",
          height: SCREEN_HEIGHT + HEADER_EXPANDED_HEIGHT - HEADER_HEIGHT,
          paddingTop: heightExpanded,
          transform: [{ translateY }],
        }}
      >
        <TopTab.Navigator
          initialRouteName="ClubHome"
          screenOptions={{ swipeEnabled: false }}
          tabBar={(props) => <TabBar {...props} height={TAB_BUTTON_HEIGHT} />}
          sceneContainerStyle={{ position: "absolute", zIndex: 1 }}
        >
          <TopTab.Screen options={{ tabBarLabel: "모임 정보" }} name="ClubHome" component={renderClubHome} initialParams={{ clubId }} />
          <TopTab.Screen options={{ tabBarLabel: "게시물" }} name="ClubFeed" component={renderClubFeed} initialParams={{ clubId }} />
        </TopTab.Navigator>
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={-5}
        pointerEvents="box-none"
        style={{ flex: 1, zIndex: gusetCommentZIndex, justifyContent: "flex-end" }}
      >
        <AnimatedFooterView style={{ opacity: guestCommentOpacity, zIndex: gusetCommentZIndex }}>
          <CommentInputView
            onLayout={(event: LayoutChangeEvent) => {
              const { height } = event.nativeEvent.layout;
              setCommentInputHeight(height + bottom);
            }}
          >
            <CircleIcon uri={me?.thumbnail} size={35} kerning={10} />
            <RoundingView>
              <CommentInput
                ref={guestCommentInputRef}
                placeholder="방명록을 작성해보세요. (최대 100자)"
                placeholderTextColor="#B0B0B0"
                value={guestComment}
                textAlign="left"
                multiline={true}
                maxLength={100}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="done"
                returnKeyLabel="done"
                textAlignVertical="center"
                onChangeText={(value: string) => {
                  setGuestComment(value);
                  if (!validation && value.trim() !== "") setValidation(true);
                  if (validation && value.trim() === "") setValidation(false);
                }}
                onEndEditing={() => setGuestComment((prev) => prev.trim())}
                includeFontPadding={false}
              />
            </RoundingView>
            {guestCommentMutation.isLoading ? (
              <SubmitLoadingView>
                <ActivityIndicator />
              </SubmitLoadingView>
            ) : (
              <SubmitButton disabled={!validation} onPress={guestCommentSubmit}>
                <SubmitButtonText disabled={!validation}>게시</SubmitButtonText>
              </SubmitButton>
            )}
          </CommentInputView>
        </AnimatedFooterView>
      </KeyboardAvoidingView>

      {clubRoleLoading ? (
        <></>
      ) : (
        <FloatingActionButton
          height={ACTION_BUTTON_HEIGHT}
          role={clubRole?.data}
          recruitStatus={clubData?.data.recruitStatus}
          openShare={openShare}
          goToClubJoin={goToClubJoin}
          goToFeedCreation={goToFeedCreation}
        />
      )}

      <ClubOptionModal
        modalRef={clubOptionRef}
        buttonHeight={modalOptionButtonHeight}
        isMyClub={clubRole?.data.applyStatus === "APPROVED" ? true : false}
        goToClubEdit={goToClubEdit}
        openShareJoin={openShareJoin}
        goToReportClub={goToReportClub}
        openShare={openShare}
      />
    </Container>
  );
};

export default ClubTopTabs;
