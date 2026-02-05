import dotenv from  "dotenv";
import connectDB from "./db/index.js";

dotenv.config({ path: ".env" });

.then(() => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`server is runninng ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGODB is failed !!!" , err);
})

connectDB();