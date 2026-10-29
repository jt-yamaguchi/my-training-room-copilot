package com.example.training.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ReservationApiTest {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Tokyo");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void 予約を登録し重複を拒否して境界と別会議室の予約を許可する() throws Exception {
        String roomId = createRoom("A会議室");
        String otherRoomId = createRoom("B会議室");
        String tomorrow = LocalDate.now(BUSINESS_ZONE).plusDays(1).toString();

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest(roomId, tomorrow, "10:00", "11:00")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.roomId").value(Integer.parseInt(roomId)))
                .andExpect(jsonPath("$.roomName").value("A会議室"))
                .andExpect(jsonPath("$.date").value(tomorrow))
                .andExpect(jsonPath("$.startTime").value("10:00"))
                .andExpect(jsonPath("$.endTime").value("11:00"))
                .andExpect(jsonPath("$.title").value("定例会議"))
                .andExpect(jsonPath("$.organizerName").value("山田"));

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest(roomId, tomorrow, "10:30", "11:30")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("指定した時間帯には既に予約があります。"));
        assertReservationCount(1);

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest(roomId, tomorrow, "11:00", "12:00")))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest(otherRoomId, tomorrow, "10:30", "11:30")))
                .andExpect(status().isCreated());
        assertReservationCount(3);
    }

    @Test
    void 終了時刻が開始時刻以前または過去日時の予約は400で拒否する() throws Exception {
        String roomId = createRoom("A会議室");
        String tomorrow = LocalDate.now(BUSINESS_ZONE).plusDays(1).toString();
        String yesterday = LocalDate.now(BUSINESS_ZONE).minusDays(1).toString();

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest(roomId, tomorrow, "10:00", "10:00")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("終了時刻は開始時刻より後にしてください。"));

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest(roomId, yesterday, "10:00", "11:00")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("過去の日時は予約できません。"));
        assertReservationCount(0);
    }

    @Test
    void 必須項目と文字数の違反は登録せず会議室が存在しない場合は404を返す() throws Exception {
        String roomId = createRoom("A会議室");
        String tomorrow = LocalDate.now(BUSINESS_ZONE).plusDays(1).toString();

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roomId":%s,"date":"%s","startTime":"10:00","endTime":"11:00",
                                "title":" ","organizerName":"山田"}
                                """.formatted(roomId, tomorrow)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                                .content(reservationRequest(
                                        roomId, tomorrow, "10:00", "11:00", "あ".repeat(101), "山田")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        mockMvc.perform(post("/api/reservations")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(reservationRequest(
                                        roomId, tomorrow, "10:00", "11:00", "定例会議", "あ".repeat(51))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        mockMvc.perform(post("/api/reservations")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(reservationRequest("999999", tomorrow, "10:00", "11:00")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("会議室が見つかりません。"));
        assertReservationCount(0);
    }

    @Test
    void 指定日の予約状況を会議室名と開始時刻順で空室も含めて取得する() throws Exception {
        String roomBId = createRoom("B会議室");
        String roomAId = createRoom("A会議室");
        createRoom("C会議室");
        String targetDate = LocalDate.now(BUSINESS_ZONE).plusDays(1).toString();
        String otherDate = LocalDate.now(BUSINESS_ZONE).plusDays(2).toString();
        createReservation(roomBId, targetDate, "09:00", "10:00");
        createReservation(roomAId, targetDate, "11:00", "12:00");
        createReservation(roomAId, targetDate, "10:00", "11:00");
        createReservation(roomAId, otherDate, "13:00", "14:00");

        mockMvc.perform(get("/api/reservations").param("date", targetDate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].roomName").value("A会議室"))
                .andExpect(jsonPath("$[0].reservations.length()").value(2))
                .andExpect(jsonPath("$[0].reservations[0].startTime").value("10:00"))
                .andExpect(jsonPath("$[0].reservations[1].startTime").value("11:00"))
                .andExpect(jsonPath("$[1].roomName").value("B会議室"))
                .andExpect(jsonPath("$[1].reservations.length()").value(1))
                .andExpect(jsonPath("$[2].roomName").value("C会議室"))
                .andExpect(jsonPath("$[2].reservations.length()").value(0));
    }

    @Test
    void 会議室別予約を日付と開始時刻順で取得し存在しない会議室は404を返す() throws Exception {
        String roomId = createRoom("A会議室");
        String otherRoomId = createRoom("B会議室");
        String tomorrow = LocalDate.now(BUSINESS_ZONE).plusDays(1).toString();
        String dayAfterTomorrow = LocalDate.now(BUSINESS_ZONE).plusDays(2).toString();
        createReservation(roomId, dayAfterTomorrow, "10:00", "11:00");
        createReservation(roomId, tomorrow, "11:00", "12:00");
        createReservation(roomId, tomorrow, "09:00", "10:00");
        createReservation(otherRoomId, tomorrow, "08:00", "09:00");

        mockMvc.perform(get("/api/rooms/{roomId}/reservations", roomId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].startTime").value("09:00"))
                .andExpect(jsonPath("$[1].startTime").value("11:00"))
                .andExpect(jsonPath("$[2].date").value(dayAfterTomorrow))
                .andExpect(jsonPath("$[2].startTime").value("10:00"));

        mockMvc.perform(get("/api/rooms/999999/reservations"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("会議室が見つかりません。"));
    }

    @Test
    void 日付が不正または未指定の場合は400を返す() throws Exception {
        mockMvc.perform(get("/api/reservations").param("date", "not-a-date"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        mockMvc.perform(get("/api/reservations"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    private String createRoom(String name) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","capacity":6,"notes":null}
                                """.formatted(name)))
                .andExpect(status().isCreated())
                .andReturn();
        Object id = com.jayway.jsonpath.JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        return String.valueOf(id);
    }

    private void createReservation(String roomId, String date, String startTime, String endTime)
            throws Exception {
        mockMvc.perform(post("/api/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reservationRequest(roomId, date, startTime, endTime)))
                .andExpect(status().isCreated());
    }

    private String reservationRequest(String roomId, String date, String startTime, String endTime) {
        return reservationRequest(roomId, date, startTime, endTime, "定例会議", "山田");
    }

    private String reservationRequest(
            String roomId,
            String date,
            String startTime,
            String endTime,
            String title,
            String organizerName) {
        return """
                {"roomId":%s,"date":"%s","startTime":"%s","endTime":"%s","title":"%s","organizerName":"%s"}
                """.formatted(roomId, date, startTime, endTime, title, organizerName);
    }

    private void assertReservationCount(int expectedCount) {
        Integer actualCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM reservations", Integer.class);
        assertEquals(expectedCount, actualCount);
    }
}
