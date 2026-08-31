package in.yapp.Repository;

import in.yapp.Entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRespository extends JpaRepository<Message, UUID> {

    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    long countByConversationIdAndCreatedAtAfterAndSenderIdNot(
            UUID conversationId,
            Instant lastReadAt,
            UUID userId
    );

    @Modifying
    @Query("""
        UPDATE Message m
        SET m.status = in.yapp.Entity.MessageStatus.READ
        WHERE m.conversation.id = :conversationId
          AND m.sender.id <> :userId
          AND m.status <> in.yapp.Entity.MessageStatus.READ
    """)
    int markMessagesAsRead(
            @Param("conversationId") UUID conversationId,
            @Param("userId") UUID userId
    );

    Optional<Message> findTopByConversationIdOrderByCreatedAtDesc(
            UUID conversationId
    );


    long countByConversationIdAndSenderIdNot(
            UUID conversationId,
            UUID userId
    );


}