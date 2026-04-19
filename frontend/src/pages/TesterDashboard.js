// /**
//  * Tester Dashboard - Allows testers to create tasks for all tester users
//  * by entering a description that gets parsed and allocated
//  */

// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Container,
//   Card,
//   CardHeader,
//   CardBody,
//   Typography,
//   Textarea,
//   Button,
//   Alert,
//   Spinner,
//   Badge,
//   Box,
// } from "@material-tailwind/react";
// import { testerAPI, getUser, logout } from "../utils/api";

// const TesterDashboard = () => {
//   const navigate = useNavigate();
//   const [user, setUser] = useState(null);
//   const [description, setDescription] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [previewLoading, setPreviewLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [preview, setPreview] = useState(null);
//   const [userCount, setUserCount] = useState(0);
//   const [targetRoles, setTargetRoles] = useState([]);
//   const [createdTasks, setCreatedTasks] = useState(null);

//   useEffect(() => {
//     const currentUser = getUser();
//     if (!currentUser) {
//       navigate("/login");
//       return;
//     }
//     setUser(currentUser);
    
//     // Check if user has tester role
//     const userRoles = currentUser.roles || [];
//     if (!userRoles.includes("tester")) {
//       setError("You don't have tester role access");
//     }
//   }, [navigate]);

//   const handlePreview = async () => {
//     if (!description.trim()) {
//       setError("Please enter a description");
//       return;
//     }
    
//     setPreviewLoading(true);
//     setError("");
//     setPreview(null);
    
//     try {
//       const data = await testerAPI.previewTask(description);
//       setPreview(data.preview);
//       setTargetRoles(data.target_roles || []);
//       setUserCount(data.user_count || 0);
//     } catch (err) {
//       setError(err.response?.data?.error || "Failed to preview task");
//     } finally {
//       setPreviewLoading(false);
//     }
//   };

//   const handleCreateTasks = async () => {
//     if (!description.trim()) {
//       setError("Please enter a description");
//       return;
//     }
    
//     setLoading(true);
//     setError("");
//     setSuccess("");
//     setCreatedTasks(null);
    
//     try {
//       const data = await testerAPI.createTasksFromDescription(description);
//       setSuccess(data.message);
//       setCreatedTasks(data.tasks);
//       setTargetRoles(data.target_roles || []);
//       setUserCount(data.tasks_created || 0);
//       setPreview(null);
//     } catch (err) {
//       setError(err.response?.data?.error || "Failed to create tasks");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = () => {
//     logout();
//     navigate("/login");
//   };

//   if (!user) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <Spinner size="xl" />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <div className="bg-white shadow-sm border-b border-gray-200">
//         <Container className="py-4 flex justify-between items-center">
//           <div>
//             <Typography variant="h4" color="blue-gray">
//               Tester Dashboard
//             </Typography>
//             <Typography variant="small" color="gray">
//               Welcome, {user.username} (Tester Role)
//             </Typography>
//           </div>
//           <Button variant="outlined" color="red" onClick={handleLogout} size="sm">
//             Logout
//           </Button>
//         </Container>
//       </div>

//       <Container className="py-8">
//         {/* Error Alert */}
//         {error && (
//           <Alert color="red" className="mb-4" onClose={() => setError("")}>
//             {error}
//           </Alert>
//         )}

//         {/* Success Alert */}
//         {success && (
//           <Alert color="green" className="mb-4" onClose={() => setSuccess("")}>
//             <Typography variant="small">
//               {success}
//               {targetRoles.length > 0 && (
//                 <span className="ml-2">
//                   (Roles: {targetRoles.join(" + ")})
//                 </span>
//               )}
//             </Typography>
//           </Alert>
//         )}

//         {/* Task Creation Form */}
//         <Card className="mb-6">
//           <CardHeader color="blue" className="relative py-3">
//             <Typography variant="h6" color="white">
//               Create Tasks for Testers
//             </Typography>
//           </CardHeader>
//           <CardBody>
//             <Typography variant="small" color="gray" className="mb-4">
//               Enter a description with role keywords (frontend, backend, fullstack, tester, hardware)
//               to create tasks for users with matching technical roles. The description will be
//               parsed using AI to extract task details like title, category, priority, and deadline.
//             </Typography>
            
//             {/* Role keywords hint */}
//             <Alert color="light-blue" className="mb-4">
//               <Typography variant="small">
//                 <strong>Supported role keywords:</strong> frontend, backend, fullstack, tester, hardware<br/>
//                 <strong>Examples:</strong>
//                 <br/>• "frontend task for login page" → allocates to frontend users
//                 <br/>• "backend API development" → allocates to backend users
//                 <br/>• "fullstack dashboard feature" → allocates to BOTH frontend AND backend users
//               </Typography>
//             </Alert>
            
//             <div className="mb-4">
//               <Typography variant="small" color="gray" className="mb-2 font-medium">
//                 Task Description
//               </Typography>
//               <Textarea
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//                 placeholder="Enter task description with role keywords (e.g., 'frontend task for login page', 'backend API development', 'fullstack feature for dashboard')"
//                 size="lg"
//                 rows={4}
//                 className="w-full"
//               />
//             </div>

//             <div className="flex gap-4">
//               <Button
//                 variant="outlined"
//                 color="blue"
//                 onClick={handlePreview}
//                 disabled={previewLoading || !description.trim()}
//               >
//                 {previewLoading ? (
//                   <>
//                     <Spinner size="sm" className="mr-2" />
//                     Parsing...
//                   </>
//                 ) : (
//                   "Preview"
//                 )}
//               </Button>
//               <Button
//                 color="blue"
//                 onClick={handleCreateTasks}
//                 disabled={loading || !description.trim()}
//               >
//                 {loading ? (
//                   <>
//                     <Spinner size="sm" className="mr-2" />
//                     Creating Tasks...
//                   </>
//                 ) : (
//                   userCount > 0
//                     ? `Create for ${userCount} User(s) [${targetRoles.join(" + ")}]`
//                     : "Create Tasks"
//                 )}
//               </Button>
//             </div>
//           </CardBody>
//         </Card>

//         {/* Preview Section */}
//         {preview && (
//           <Card className="mb-6 border-l-4 border-l-blue-500">
//             <CardHeader color="blue-gray" className="py-3">
//               <Typography variant="h6" color="white">
//                 Task Preview
//               </Typography>
//             </CardHeader>
//             <CardBody>
//               {/* Target Roles Info */}
//               <Alert color="green" className="mb-4">
//                 <Typography variant="small">
//                   <strong>Target Roles:</strong> {targetRoles.join(" + ")}
//                   <span className="ml-2">|</span>
//                   <strong>Users:</strong> {userCount}
//                 </Typography>
//               </Alert>
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <Box>
//                   <Typography variant="small" color="gray">
//                     Title
//                   </Typography>
//                   <Typography variant="h6">
//                     {preview.title || preview.title_en || "N/A"}
//                   </Typography>
//                 </Box>
//                 <Box>
//                   <Typography variant="small" color="gray">
//                     Category
//                   </Typography>
//                   <Typography variant="h6" className="capitalize">
//                     {preview.category || "general"}
//                   </Typography>
//                 </Box>
//                 <Box>
//                   <Typography variant="small" color="gray">
//                     Priority
//                   </Typography>
//                   <Badge 
//                     color={
//                       preview.priority === "urgent" ? "red" :
//                       preview.priority === "high" ? "orange" :
//                       preview.priority === "low" ? "green" : "blue"
//                     }
//                     text={preview.priority || "medium"}
//                   />
//                 </Box>
//                 <Box>
//                   <Typography variant="small" color="gray">
//                     Deadline
//                   </Typography>
//                   <Typography variant="body1">
//                     {preview.deadline || "Not specified"}
//                   </Typography>
//                 </Box>
//                 {preview.subtasks && preview.subtasks.length > 0 && (
//                   <Box className="md:col-span-2">
//                     <Typography variant="small" color="gray" className="mb-2">
//                       Suggested Subtasks
//                     </Typography>
//                     <ul className="list-disc pl-5">
//                       {preview.subtasks.map((subtask, index) => (
//                         <li key={index}>
//                           <Typography variant="small">{subtask}</Typography>
//                         </li>
//                       ))}
//                     </ul>
//                   </Box>
//                 )}
//                 <Box className="md:col-span-2">
//                   <Typography variant="small" color="gray">
//                     Description
//                   </Typography>
//                   <Typography variant="body2">
//                     {description}
//                   </Typography>
//                 </Box>
//               </div>
//             </CardBody>
//           </Card>
//         )}

//         {/* Created Tasks Section */}
//         {createdTasks && createdTasks.length > 0 && (
//           <Card>
//             <CardHeader color="green" className="py-3">
//               <Typography variant="h6" color="white">
//                 Tasks Created Successfully
//               </Typography>
//             </CardHeader>
//             <CardBody>
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50">
//                     <tr>
//                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
//                         Task ID
//                       </th>
//                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
//                         Title
//                       </th>
//                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
//                         Priority
//                       </th>
//                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
//                         Category
//                       </th>
//                       <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
//                         Status
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {createdTasks.map((task) => (
//                       <tr key={task.id}>
//                         <td className="px-4 py-2 text-sm">#{task.id}</td>
//                         <td className="px-4 py-2 text-sm font-medium">{task.title}</td>
//                         <td className="px-4 py-2 text-sm capitalize">
//                           <Badge 
//                             color={
//                               task.priority === "urgent" ? "red" :
//                               task.priority === "high" ? "orange" :
//                               task.priority === "low" ? "green" : "blue"
//                             }
//                             text={task.priority}
//                           />
//                         </td>
//                         <td className="px-4 py-2 text-sm capitalize">{task.category}</td>
//                         <td className="px-4 py-2 text-sm">
//                           <Badge color="blue" text={task.status} />
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             </CardBody>
//           </Card>
//         )}

//         {/* Info Card */}
//         <Card className="mt-6 bg-blue-50">
//           <CardBody>
//             <Typography variant="h6" color="blue">
//               How it works
//             </Typography>
//             <Typography variant="small" color="gray" className="mt-2">
//               Enter a description with role keywords to allocate tasks to users with matching technical roles.
//               The system detects keywords and creates tasks for all users with those roles:
//             </Typography>
//             <ul className="list-disc pl-5 mt-2 text-sm text-gray-600">
//               <li><strong>frontend</strong> → allocates to frontend role users</li>
//               <li><strong>backend</strong> → allocates to backend role users</li>
//               <li><strong>fullstack</strong> → allocates to BOTH frontend AND backend users</li>
//               <li><strong>tester</strong> → allocates to tester role users</li>
//               <li><strong>hardware</strong> → allocates to hardware role users</li>
//             </ul>
//             <Typography variant="small" color="gray" className="mt-2">
//               The system will also parse your description using AI to extract task details like title,
//               category, priority, and deadline.
//             </Typography>
//           </CardBody>
//         </Card>
//       </Container>
//     </div>
//   );
// };

// export default TesterDashboard;