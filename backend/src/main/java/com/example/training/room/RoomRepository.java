package com.example.training.room;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findAllByOrderByIdAsc();

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT room FROM Room room WHERE room.id = :roomId")
    Optional<Room> findByIdForUpdate(@Param("roomId") Long roomId);

    @Query(value = """
            SELECT EXISTS (
                SELECT 1
                FROM reservations
                WHERE room_id = :roomId
                  AND (
                    reservation_date > :currentDate
                    OR (reservation_date = :currentDate AND end_time > :currentTime)
                  )
            )
            """, nativeQuery = true)
    boolean hasActiveOrFutureReservations(
            @Param("roomId") Long roomId,
            @Param("currentDate") LocalDate currentDate,
            @Param("currentTime") LocalTime currentTime);
}
