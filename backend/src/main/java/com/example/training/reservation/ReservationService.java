package com.example.training.reservation;

import com.example.training.common.BadRequestException;
import com.example.training.common.ConflictException;
import com.example.training.common.NotFoundException;
import com.example.training.reservation.dto.ReservationRequest;
import com.example.training.reservation.dto.ReservationResponse;
import com.example.training.reservation.dto.ReservationScheduleResponse;
import com.example.training.room.Room;
import com.example.training.room.RoomRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReservationService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Tokyo");

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;

    public ReservationService(ReservationRepository reservationRepository, RoomRepository roomRepository) {
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
    }

    @Transactional
    public ReservationResponse create(ReservationRequest request) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new BadRequestException("終了時刻は開始時刻より後にしてください。");
        }
        LocalDateTime reservationStart = LocalDateTime.of(request.date(), request.startTime());
        if (!reservationStart.isAfter(LocalDateTime.now(BUSINESS_ZONE))) {
            throw new BadRequestException("過去の日時は予約できません。");
        }

        Room room = roomRepository.findByIdForUpdate(request.roomId())
                .orElseThrow(() -> new NotFoundException("会議室が見つかりません。"));
        if (reservationRepository.existsOverlappingReservation(
                room.getId(), request.date(), request.startTime(), request.endTime())) {
            throw new ConflictException("指定した時間帯には既に予約があります。");
        }

        Reservation reservation = reservationRepository.saveAndFlush(new Reservation(
                room,
                request.title(),
                request.organizerName(),
                request.date(),
                request.startTime(),
                request.endTime()));
        return ReservationResponse.from(reservation);
    }

    public List<ReservationScheduleResponse> findByDate(LocalDate date) {
        Map<Long, List<ReservationResponse>> reservationsByRoom = reservationRepository
                .findAllByDateWithRoom(date).stream()
                .collect(Collectors.groupingBy(
                        reservation -> reservation.getRoom().getId(),
                        Collectors.mapping(ReservationResponse::from, Collectors.toList())));

        return roomRepository.findAllByOrderByNameAsc().stream()
                .map(room -> new ReservationScheduleResponse(
                        room.getId(),
                        room.getName(),
                        reservationsByRoom.getOrDefault(room.getId(), List.of())))
                .toList();
    }

    public List<ReservationResponse> findByRoom(Long roomId) {
        if (!roomRepository.existsById(roomId)) {
            throw new NotFoundException("会議室が見つかりません。");
        }
        return reservationRepository.findAllByRoomIdWithRoomOrderByDateAndStartTime(roomId).stream()
                .map(ReservationResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long reservationId) {
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new NotFoundException("予約が見つかりません。"));
        reservationRepository.delete(reservation);
        reservationRepository.flush();
    }
}
