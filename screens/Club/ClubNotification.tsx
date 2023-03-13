import React, { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, DeviceEventEmitter, FlatList, StatusBar, TouchableOpacity, View } from "react-native";
import { useToast } from "react-native-toast-notifications";
import { useQuery } from "react-query";
import styled from "styled-components/native";
import { ClubApi, ErrorResponse, Notification, NotificationsResponse } from "../../api";
import CustomText from "../../components/CustomText";
import NotificationItem from "../../components/NotificationItem";

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

const EmptyText = styled(CustomText)`
  font-size: 14px;
  line-height: 20px;
  color: #bdbdbd;
  justify-content: center;
  align-items: center;
`;

const ClubNotification = ({
  navigation: { navigate, goBack },
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
  } = useQuery<NotificationsResponse, ErrorResponse>(["getClubNotifications", clubData.id], ClubApi.getClubNotifications, {
    onSuccess: (res) => {},
    onError: (error) => {
      console.log(`API ERROR | getClubNotifications ${error.code} ${error.status}`);
      toast.show(`${error.message ?? error.code}`, { type: "warning" });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await notiRefetch();
    setRefreshing(false);
  };

  useEffect(() => {
    let clubNotiSubs = DeviceEventEmitter.addListener("ClubNotificationRefresh", () => {
      console.log("ClubNotification - Refresh Event");
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

  const onPressItem = (item: Notification) => {
    if (clubRole && ["MASTER", "MANAGER"].includes(clubRole?.role)) {
      if (item.actionType === "APPLY") {
        return navigate("ClubApplication", {
          clubData,
          actionId: item.actionId,
          actionerName: item.actionerName,
          actionerId: item.actionerId,
          message: item.message,
          createdTime: item.created,
          processDone: item.processDone,
        });
      }
    } else {
      toast.show("가입신청서를 볼 수 있는 권한이 없습니다.", {
        type: "warning",
      });
    }
  };

  return notiLoading ? (
    <Loader>
      <ActivityIndicator />
    </Loader>
  ) : (
    <Container>
      <StatusBar backgroundColor={"white"} barStyle={"dark-content"} />
      <FlatList
        contentContainerStyle={{ flexGrow: 1, paddingVertical: 10, paddingHorizontal: SCREEN_PADDING_SIZE }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        data={notifications && Array.isArray(notifications?.data) ? [...notifications?.data].reverse() : []}
        ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
        keyExtractor={(item: Notification, index: number) => String(index)}
        renderItem={({ item, index }: { item: Notification; index: number }) => (
          <TouchableOpacity onPress={() => onPressItem(item)}>
            <NotificationItem notificationData={item} clubData={clubData} />
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
