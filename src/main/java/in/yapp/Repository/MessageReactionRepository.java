package in.yapp.Repository;

import in.yapp.Entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageReactionRepository
        extends JpaRepository<MessageReaction, UUID> {

    Optional<MessageReaction> findByMessageIdAndUserId(
            UUID messageId,
            UUID userId
    );

    List<MessageReaction> findByMessageId(
            UUID messageId
    );

    List<MessageReaction> findByMessageConversationId(
            UUID conversationId
    );

    void deleteByMessageIdAndUserId(
            UUID messageId,
            UUID userId
    );
}