package com.example.training.reservation;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
