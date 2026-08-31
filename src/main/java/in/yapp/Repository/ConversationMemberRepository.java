package in.yapp.Repository;

import in.yapp.Entity.Conversation;
import in.yapp.Entity.ConversationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationMemberRepository extends JpaRepository<ConversationMember, UUID>
{

    @Query("""
    SELECT cm1.conversation
    FROM conversation_members cm1
    JOIN conversation_members cm2
        ON cm1.conversation.id = cm2.conversation.id
    WHERE cm1.user.id = :user1Id
      AND cm2.user.id = :user2Id
      AND cm1.conversation.type = in.yapp.Entity.ConversationType.DIRECT
""")
    Optional<Conversation> findDirectConversation(
            @Param("user1Id") UUID user1Id,
            @Param("user2Id") UUID user2Id
    );


    //to check whther the user belongs to this conversation
    boolean existsByConversationIdAndUserId(
            UUID conversationId,
            UUID userId
    );


    List<ConversationMember> findByConversationId(
            UUID conversationId
    );


    List<ConversationMember> findByUserId(UUID userId);

    Optional<ConversationMember> findByConversationIdAndUserId(
            UUID conversationId,
            UUID userId
    );





}
