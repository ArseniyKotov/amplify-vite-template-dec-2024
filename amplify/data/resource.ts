import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a
  .schema({
    Todo: a.model({
      content: a.string(),
    }),
    ProductListItem: a
      .model({
        id: a.id().required(),
        product_name: a.string(),
        product_description: a.string(),
        product_category: a.string(),
        // updated_by_id: a.email().required(),
        // updated_by: a.belongsTo("Member", "updated_by_id"), //CHANGED? probably not because the update_by is the same
        workspaceID: a.id().required(),
        workspace: a.belongsTo('Workspace', 'workspaceID'),
        organizationID: a.id().required(),
        organization: a.belongsTo('Organization', 'organizationID'),
      })
      .secondaryIndexes((index) => [
        index('workspaceID').name('byWorkspace'),
        index('organizationID').name('byOrganization'),
      ]),

    Comment: a
      .model({
        id: a.id().required(),
        comment: a.string(),
        alertFeedbackID: a.string().required(),
        alertFeedback: a.belongsTo('AlertFeedback', 'alertFeedbackID'),
        memberID: a.id().required(),
        workspaceID: a.id().required(),
        organizationID: a.id().required(),
        isAutomated: a.boolean(),
      })
      .secondaryIndexes((index) => [
        index('alertFeedbackID').name('byAlertFeedback'),
        index('memberID').name('byMember'),
        index('workspaceID').name('byWorkspace'),
        index('organizationID').name('byOrganization'),
      ]),

    Member: a
      .model({
        email: a.email().required(),
        name: a.string(),
        label: a.string(),
        organizationID: a.id().required(),
        workspaceID: a.id().required(),
        workspaces: a.belongsTo('Workspace', 'workspaceID'), //ADDED
        conversations: a.hasMany('ConversationMember', 'memberID'), //RECONSIDER
        alertInstanceLinks: a.hasMany('AlertInstanceLink', 'linkedByEmail'),
        // updatedProductListItems: a.hasMany("ProductListItem", "updated_by_id"),
      })
      .identifier(['email'])
      .secondaryIndexes((index) => [
        index('organizationID').name('byOrganization'),
        index('workspaceID').name('byWorkspace'),
      ]),

    Deadline: a.customType({
      date: a.string(),
      description: a.string(),
    }),

    Link: a.customType({
      title: a.string(),
      url: a.string(),
    }),
    CategoryType: a.enum([
      'INCLUDE',
      'EXCLUDE',
      'RECOMMEND_INCLUDE',
      'RECOMMEND_EXCLUDE',
      'UNCLASSIFIED',
    ]),

    Category: a.customType({
      algorithm_defined: a.ref('CategoryType').array(),
      user_defined: a.ref('CategoryType').array(),
    }),

    AlertType: a.enum(['PROPOSED_REGULATION', 'REGULATION', 'NOTICE']),

    Region: a.enum([
      'US',
      'EU',
      'GLOBAL',
      'CUSTOM',
      'IN',
      'CH',
      'CA',
      'JP',
      'LA',
    ]),

    Alert: a
      .model({
        id: a.id().required(),
        raw_id: a.id(),
        report_date: a.date(),
        organizationID: a.id(),
        organization: a.belongsTo('Organization', 'organizationID'),
        // workspaceID: a.id().required(),
        // workspace: a.belongsTo("Workspace", "workspaceID"), // TODO review it's a many to many
        AlertFeedbacks: a.hasMany('AlertFeedback', 'alertID'),
        alertInstances: a.hasMany('AlertInstance', 'alertID'),
      })
      .secondaryIndexes((index) => [index('raw_id').name('byRawID')]),

    SourceType: a.enum(['STANDARD', 'CUSTOM', 'INTERNAL']),

    AlertFeedback: a
      .model({
        id: a.id().required(),
        title: a.string(),
        source: a.string(),
        agency_name: a.string(),
        type: a.ref('AlertType'),
        summary: a.string(),
        links: a.ref('Link').array(),
        deadline: a.ref('Deadline'),
        region: a.ref('Region'),
        published_on: a.date(),
        jurisdiction: a.string(),
        alertID: a.id().required(),
        alert: a.belongsTo('Alert', 'alertID'), //Alert @belongsTo(fields: ["alertID"])

        memberID: a.id(), // ID @index(name: "byMember")
        reportID: a.id().required(), //ID! @index(name: "byReportAlertFeedbacks")
        report: a.belongsTo('Report', 'reportID'), //Report @belongsTo(fields: ["reportID"])
        alertInstanceID: a.id(),
        alertInstance: a.belongsTo('AlertInstance', 'alertInstanceID'), //a.hasOne("AlertInstance", "alertFeedbackID"), //CHANGED from original //AlertInstance @hasOne(fields: ["alertInstanceID"])
        report_date: a.date(),
        relevance: a.string(),
        category_algorithm_defined: a.ref('CategoryType'),
        category_user_defined: a.ref('CategoryType'),
        category_prevalidation: a.ref('CategoryType'),
        workspaceID: a.id().required(), //@index(name: "byWorkspace", sortKeyFields: ["alertID"])
        organizationID: a.id().required(), //ID! @index(name: "byOrganization")
        Comments: a.hasMany('Comment', 'alertFeedbackID'), //[Comment] @hasMany(indexName: "byAlertFeedback", fields: ["id"])
        Conversations: a.hasMany('Conversation', 'alertFeedbackID'), //[Conversation] @hasMany
        source_type: a.ref('SourceType'),
        source_subtype: a.string(),
        alert_overview: a.string(),
        custom_tag_ids: a.string().array(),
        custom_tags: a.hasMany('AlertFeedbackTag', 'alertFeedbackID'), //     @hasMany(indexName: "byAlertFeedbackTags", fields: ["id"])
        productImplications: a.string(),
      })
      .secondaryIndexes((index) => [
        index('alertID').name('byAlert'),
        index('reportID').name('byReport'),
        index('workspaceID').sortKeys(['alertID']),
        index('alertInstanceID').name('byAlertInstance'),
      ]),
    AlertInstance: a
      .model({
        id: a.id().required(),
        alertID: a.id().required(),
        alert: a.belongsTo('Alert', 'alertID'),
        alertFeedbackID: a.id(),
        alertFeedback: a.hasOne('AlertFeedback', 'alertInstanceID'),
        ownerID: a.email(),
        organizationID: a.id().required(),
        isActive: a.boolean().required(),
        attachments: a.hasMany('Attachment', 'alertInstanceID'),
        alertInstanceLinks: a.hasMany(
          'AlertInstanceLink',
          'sourceAlertInstanceID'
        ),
        alertInstanceGroups: a.hasMany(
          'AlertInstanceGroup',
          'rootAlertInstanceID'
        ),
        //ADDED
        linkedAlertInstanceLinks: a.hasMany(
          'AlertInstanceLink',
          'linkedAlertInstanceID'
        ),
      })
      .secondaryIndexes((index) => [
        index('alertID').name('byAlert'),
        // index("alertFeedbackID").name("byAlertFeedback"),
      ]),

    AlertInstanceGroup: a
      .model({
        type: a.string().default('USER_DEFINED_BIDIRECTIONAL'),
        rootAlertInstanceID: a.id(),
        rootAlertInstance: a.belongsTo('AlertInstance', 'rootAlertInstanceID'),
        alertInstanceLinks: a.hasMany('AlertInstanceLink', 'groupID'),
      })
      .secondaryIndexes((index) => [
        index('rootAlertInstanceID').name('byAlertInstanceGroup'),
      ]),

    AlertInstanceLink: a
      .model({
        id: a.id().required(),
        groupID: a.id().required(),
        group: a.belongsTo('AlertInstanceGroup', 'groupID'),
        sourceAlertInstanceID: a.id().required(),
        sourceAlertInstance: a.belongsTo(
          'AlertInstance',
          'sourceAlertInstanceID'
        ),
        linkedAlertInstanceID: a.id().required(),
        linkedAlertInstance: a.belongsTo(
          'AlertInstance',
          'linkedAlertInstanceID'
        ),
        linkedByEmail: a.email().required(),
        linkedBy: a.belongsTo('Member', 'linkedByEmail'),
      })
      .secondaryIndexes((index) => [
        index('groupID').name('byGroupID').sortKeys(['sourceAlertInstanceID']),
        index('sourceAlertInstanceID').sortKeys([
          'groupID',
          'linkedAlertInstanceID',
        ]),
        index('linkedAlertInstanceID').sortKeys([
          'groupID',
          'sourceAlertInstanceID',
        ]),
      ])
      .identifier([
        'id',
        'groupID',
        'sourceAlertInstanceID',
        'linkedAlertInstanceID',
      ]),

    Report: a
      .model({
        id: a.id().required(),
        report_date: a.date(),
        AlertFeedbacks: a.hasMany('AlertFeedback', 'reportID'),
        organizationID: a.id().required(),
        organization: a.belongsTo('Organization', 'organizationID'),
        workspaceID: a.id().required(),
        workspace: a.belongsTo('Workspace', 'workspaceID'),
        reports_analyzed: a.integer(),
        relevant_alerts: a.integer(),
        irrelevant_alerts: a.integer(),
        human_validation_required: a.integer(),
        recommend_include: a.integer(),
      })
      .secondaryIndexes((index) => [
        index('organizationID'),
        index('workspaceID').queryField('reportsByWorkspaceID'),
      ]),

    AgencySettings: a
      .model({
        id: a.id().required(),
        agency_name: a.string(),
        include_list: a.string().array(),
        exclude_list: a.string().array(),
        exact_include_list: a.string().array(),
        exact_exclude_list: a.string().array(),
        organizationID: a.id().required(),
        organization: a.belongsTo('Organization', 'organizationID'),
        workspaceID: a.id().required(),
        workspace: a.belongsTo('Workspace', 'workspaceID'),
        region: a.ref('Region'),
      })
      .secondaryIndexes((index) => [
        index('organizationID').name('byOrganization'),
        index('workspaceID').name('byWorkspace'),
      ]),

    Workspace: a
      .model({
        id: a.id().required(),
        organizationID: a.id().required(),
        organization: a.belongsTo('Organization', 'organizationID'),
        members: a.hasMany('Member', 'workspaceID'),
        AgenciesSettings: a.hasMany('AgencySettings', 'workspaceID'),
        // Alerts: a.hasMany("Alert", "workspaceID"), //Alerts or WorkspaceAlerts?
        Reports: a.hasMany('Report', 'workspaceID'),
        name: a.string(),
        ProductList: a.hasMany('ProductListItem', 'workspaceID'),
        product_categories: a.string().array(),
        regions: a.ref('Region').array(),
        isActive: a.boolean(),
        jurisdictions: a.string().array(),
        source_filter: a.json(),
        alert_tags: a.hasMany('AlertTag', 'workspaceID'),
      })
      .secondaryIndexes((index) => [
        index('organizationID').name('byOrganization'),
      ]),

    WorkspaceUsage: a
      .model({
        id: a.id().required(),
        workspaceID: a.id().required(),
        chatbotMessageLimit: a.integer().required(),
        chatbotLastChat: a.string().required(),
        chatbotNumMessages: a.integer().required(),
      })
      .secondaryIndexes((index) => [
        index('workspaceID').name('byWorkspaceID'),
      ]),

    Organization: a.model({
      id: a.id().required(),
      AgenciesSettings: a.hasMany('AgencySettings', 'organizationID'),
      Workspaces: a.hasMany('Workspace', 'organizationID'),
      Alerts: a.hasMany('Alert', 'organizationID'),
      Reports: a.hasMany('Report', 'organizationID'),
      name: a.string().required(),
      ProductList: a.hasMany('ProductListItem', 'organizationID'),
      product_categories: a.string().array(),
      regions: a.ref('Region').array(),
      isActive: a.boolean(),
      manualReview: a.boolean(),
    }),

    // WorkspaceAlerts: a.model({
    //   id: a.id().required(),
    //   workspaceID: a.id().required(),
    //   workspace: a.belongsTo("Workspace", "workspaceID"),
    //   // alertID: a.id().required(), //TODO
    //   // alert: a.belongsTo("Alert", "alertID"),
    // }),

    ConversationCategory: a.enum(['AWARENESS', 'QUESTION']),

    Conversation: a.model({
      id: a.id().required(),
      organizationID: a.id().required(),
      alertFeedbackID: a.id().required(),
      alertFeedback: a.belongsTo('AlertFeedback', 'alertFeedbackID'),
      lastMessageSentID: a.id(),
      // lastMessageSent: a.belongsTo("Message", "lastMessageSentID"), //CHANGED from hasOne to belongsTo
      messages: a.hasMany('Message', 'conversationID'),
      category: a.ref('ConversationCategory').required(),
      members: a.hasMany('ConversationMember', 'conversationID'),
    }),

    MemberStatus: a.enum([
      'AWAITING_RESPONSE',
      'ACTION_REQUIRED',
      'ARCHIVED',
      'PENDING',
    ]),

    ConversationMemberRole: a.enum(['INITIATOR', 'RECIPIENT']),

    ConversationMember: a
      .model({
        id: a.id().required(),
        organizationID: a.id().required(),
        memberID: a.email().required(),
        member: a.belongsTo('Member', 'memberID'),
        conversationID: a.id().required(),
        conversation: a.belongsTo('Conversation', 'conversationID'),
        status: a.ref('MemberStatus'),
        role: a.ref('ConversationMemberRole'),
      })
      .secondaryIndexes((index) => [index('memberID')]),

    Message: a
      .model({
        id: a.id().required(),
        organizationID: a.id().required(),
        memberID: a.email().required(),
        conversationID: a.id().required(),
        conversation: a.belongsTo('Conversation', 'conversationID'),
        content: a.string().required(),
      })
      .secondaryIndexes((index) => [
        index('memberID').name('byMessage'),
        index('conversationID').name('byConversation'),
      ]),

    ChatbotConversation: a
      .model({
        id: a.id().required(),
        memberID: a.id().required(),
        alertID: a.id(),
        workspaceID: a.id().required(),
        messages: a.hasMany('ChatbotConversationMessage', 'conversationID'),
        name: a.string(),
        lastMessageAt: a.string(),
      })
      .secondaryIndexes((index) => [
        index('memberID').sortKeys(['alertID']).name('byMemberID'),
      ]),

    ChatbotConversationSenderType: a.enum(['ASSISTANT', 'USER']),

    ChatbotConversationMessageSource: a
      .model({
        id: a.id().required(),
        chatbotMessageID: a.id().required(), //ID! @index(name: "byChatbotMessage")
        chatbotMessage: a.belongsTo(
          'ChatbotConversationMessage',
          'chatbotMessageID'
        ),
        url: a.string().required(),
        fileName: a.string().required(),
        pageNumber: a.string(),
        content: a.string(),
        alertID: a.id().required(),
        s3_key: a.string(),
      })
      .secondaryIndexes((index) => [
        index('chatbotMessageID').name('byChatbotMessage'),
      ]),

    ChatbotConversationMessage: a
      .model({
        id: a.id().required(),
        conversationID: a.id().required(), //POSSIBLE renaming
        conversation: a.belongsTo('ChatbotConversation', 'conversationID'),
        content: a.string(),
        senderType: a.ref('ChatbotConversationSenderType').required(),
        sources: a.hasMany(
          'ChatbotConversationMessageSource',
          'chatbotMessageID' //TOREVIEW
        ),
      })
      .secondaryIndexes((index) => [
        index('conversationID').name('byConversation'),
      ]),

    Attachment: a
      .model({
        id: a.id().required(),
        alertInstanceID: a.id().required(), // @index(name: "byAlertInstance")
        alertInstance: a.belongsTo('AlertInstance', 'alertInstanceID'),
        s3_key: a.string().required(),
        fileName: a.string(), // # Display Name
        fileType: a.string().required(),
        fileSize: a.integer().required(),
        ownerID: a.email().required(),
        uploadTime: a.string(),
        status: a.string().required(),
      })
      .secondaryIndexes((index) => [
        index('alertInstanceID').name('byAlertInstance'),
      ]),

    AlertFeedbackTag: a
      .model({
        id: a.id().required(),
        alertTagID: a.id().required(),
        alertTag: a.belongsTo('AlertTag', 'alertTagID'),
        alertFeedbackID: a.id().required(),
        alertFeedback: a.belongsTo('AlertFeedback', 'alertFeedbackID'),
      })
      .secondaryIndexes((index) => [
        index('alertTagID').name('byTagAlertFeedbacks'),
        index('alertFeedbackID').name('byAlertFeedbackTags'),
      ]),

    AlertTagCategory: a.enum(['WORKSPACE', 'ORGANIZATION']),

    AlertTag: a
      .model({
        id: a.id().required(),
        workspace: a.belongsTo('Workspace', 'workspaceID'),
        workspaceID: a.id().required(),
        name: a.string(),
        deletedAt: a.string(),
        category: a.ref('AlertTagCategory'),
        alertFeedbacks: a.hasMany('AlertFeedbackTag', 'alertTagID'),
      })
      .secondaryIndexes((index) => [
        index('workspaceID').name('byWorkspaceID'),
      ]),
  })
  .authorization((allow) => [allow.publicApiKey()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 364, // 365 is the max I think - TODO check
    },
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
