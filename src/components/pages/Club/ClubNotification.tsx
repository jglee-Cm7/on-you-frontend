import { Entypo } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useLayoutEffect, useState } from "react";
import { ActivityIndicator, BackHandler, DeviceEventEmitter, FlatList, StatusBar, TouchableOpacity, View } from "react-native";
import { useToast } from "react-native-toast-notifications";
import { useMutation, useQuery } from "react-query";
import styled from "styled-components/native";
import { BaseResponse, ClubApi, CommonApi, ErrorResponse, Notification, NotificationsResponse, ReadActionRequest } from "api";
import { ClubStackParamList } from "@navigation/ClubStack";
import NotificationItem from "@components/organisms/NotificationItem";

const SCREEN_PADDING_SIZE = 20;

const Loader = styled.SafeAreaView`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const Container = styled.SafeAreaView`
  flex: 1;
`;

const EmptyView = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const EmptyText = styled.Text`
  font-family: ${(props) => props.theme.koreanFontR};
  font-size: 14px;
  line-height: 20px;
  color: #acacac;
  justify-content: center;
  align-items: center;
`;

const ClubNotification: React.FC<NativeStackScreenProps<ClubStackParamList, "ClubNotification">> = ({
  navigation: { goBack, setOptions, push },
  route: {
    params: { clubData, clubRole },
  },
}) => {
  const toast = useToast();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const {
    data: notifications,
    isLoading: notiLoading,
    refetch: notiRefetch,
  } = useQuery<NotificationsResponse, ErrorResponse>(["getClubNotifications", clubData?.id], ClubApi.getClubNotifications, {
    onError: (error) => {
      console.log(`API ERROR | getClubNotifications ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const readActionMutation = useMutation<BaseResponse, ErrorResponse, ReadActionRequest>(CommonApi.readAction, {
    onError: (error) => {
      console.log(`API ERROR | readAction ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await notiRefetch();
    setRefreshing(false);
  };

  useLayoutEffect(() => {
    setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => goBack()}>
          <Entypo name="chevron-thin-left" size={20} color="black"></Entypo>
        </TouchableOpacity>
      ),
    });
  }, []);

  useEffect(() => {
    const clubNotiSubs = DeviceEventEmitter.addListener("ClubNotificationRefresh", () => {
      onRefresh();
    });
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      goBack();
      return true;
    });
    return () => {
      clubNotiSubs.remove();
      backHandler.remove();
    };
  }, []);

  const handlingActions = ["APPLY", "APPROVE", "REJECT", "FEED_CREATE", "SCHEDULE_CREATE"];

  const readAction = (item: Notification) => {
    if (item.read || item.done) return;
    const requestData: ReadActionRequest = { actionId: item.actionId };
    readActionMutation.mutate(requestData, {
      onSuccess: () => {
        item.read = true;
      },
    });
  };

  const onPressItem = (item: Notification) => {
    if (item.actionType === "APPLY") {
      if (clubRole && ["MASTER", "MANAGER"].includes(clubRole?.role)) {
        const clubApplicationProps = {
          clubData,
          actionId: item.actionId,
          actionerName: item.actionerName,
          actionerId: item.actionerId,
          message: item.message,
          createdTime: item.created,
          processDone: item.done || item.processDone,
        };
        return push("ClubApplication", clubApplicationProps);
      } else {
        return toast.show("가입신청서를 볼 수 있는 권한이 없습니다.", { type: "warning" });
      }
    } else if (item.actionType === "FEED_CREATE") {
      readAction(item);
      // const targetIndex = feeds.findIndex((feed => feed.id === id)); 현재 feed redux에서 찾아보기
      if (item.actionFeedId === undefined) {
        const clubFeedDetailProps = {
          clubData,
          targetIndex: 0,
        };
        return push("ClubFeedDetail", clubFeedDetailProps);
      } else {
        const feedSelectionProps = { selectFeedId: item.actionFeedId };
        return push("FeedStack", { screen: "FeedSelection", params: feedSelectionProps });
      }
    } else if (item.actionType === "SCHEDULE_CREATE") {
      readAction(item);
      goBack();
    }
  };

  return notiLoading ? (
    <Loader>
      <ActivityIndicator />
    </Loader>
  ) : (
    <Container>
      <StatusBar translucent backgroundColor={"transparent"} barStyle={"dark-content"} />
      <FlatList
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 10, paddingHorizontal: SCREEN_PADDING_SIZE }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        data={notifications && Array.isArray(notifications?.data) ? [...(notifications?.data ?? [])].filter((item) => handlingActions.includes(item.actionType ?? "")).reverse() : []}
        ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
        keyExtractor={(item: Notification, index: number) => String(index)}
        renderItem={({ item }: { item: Notification }) => (
          <TouchableOpacity onPress={() => onPressItem(item)}>
            <NotificationItem notificationData={item} notificationType={"CLUB"} clubData={clubData} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <EmptyView>
            <EmptyText>{`아직 도착한 소식이 없습니다.`}</EmptyText>
          </EmptyView>
        )}
      />
    </Container>
  );
};

export default ClubNotification;
