package com.example.training.room;

import com.example.training.common.ConflictException;
import com.example.training.common.NotFoundException;
import com.example.training.room.dto.RoomRequest;
import com.example.training.room.dto.RoomResponse;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RoomService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Tokyo");

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public List<RoomResponse> findAll() {
        return roomRepository.findAllByOrderByIdAsc().stream()
                .map(RoomResponse::from)
                .toList();
    }

    @Transactional
    public RoomResponse create(RoomRequest request) {
        if (roomRepository.existsByName(request.name())) {
            throw duplicateName();
        }
        return RoomResponse.from(roomRepository.saveAndFlush(
                new Room(request.name(), request.capacity(), request.notes())));
    }

    @Transactional
    public RoomResponse update(Long roomId, RoomRequest request) {
        Room room = findRoom(roomId);
        if (roomRepository.existsByNameAndIdNot(request.name(), roomId)) {
            throw duplicateName();
        }
        room.update(request.name(), request.capacity(), request.notes());
        return RoomResponse.from(roomRepository.saveAndFlush(room));
    }

    @Transactional
    public void delete(Long roomId) {
        Room room = findRoom(roomId);
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalTime now = LocalTime.now(BUSINESS_ZONE);
        if (roomRepository.hasActiveOrFutureReservations(roomId, today, now)) {
            throw new ConflictException("予約がある会議室は削除できません。");
        }
        roomRepository.delete(room);
        roomRepository.flush();
    }

    private Room findRoom(Long roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("会議室が見つかりません。"));
    }

    private ConflictException duplicateName() {
        return new ConflictException("会議室名は既に使用されています。");
    }
}
